"""
Create temporal sequences for world-model forecasting.
Convert tumbling windows into overlapping sequences for LSTM.
"""
import pandas as pd
import numpy as np
from pathlib import Path


SEQUENCE_LENGTH = 5  # Number of consecutive 5-min windows
FORECAST_HORIZONS = [5, 10, 15, 20]  # Minutes ahead to predict
WINDOW_MINUTES = 5


def create_sequences_from_windows(windowed_path: str, output_path: str):
    """Convert tumbling windows into temporal sequences for forecasting."""
    print(f"Loading windowed data: {windowed_path}")
    df = pd.read_parquet(windowed_path)
    print(f"  Loaded {len(df)} windows")

    # Sort chronologically
    df = df.sort_values('window_start').reset_index(drop=True)

    # Group into sequences - each sequence is consecutive windows.
    # NON-OVERLAPPING (step = SEQUENCE_LENGTH) so that no source window is
    # shared across the chronological train/val/test split (prevents leakage).
    all_sequences = []

    for seq_start_idx in range(0, len(df) - SEQUENCE_LENGTH - max(FORECAST_HORIZONS) // WINDOW_MINUTES + 1, SEQUENCE_LENGTH):
        # Get the sequence block (non-overlapping consecutive windows)
        seq_windows = df.iloc[seq_start_idx:seq_start_idx + SEQUENCE_LENGTH]

        if len(seq_windows) < SEQUENCE_LENGTH:
            continue

        # Aggregate features for the sequence
        seq_feat = {
            'sequence_id': seq_start_idx,
            'seq_start': seq_windows['window_start'].min(),
            'seq_end': seq_windows['window_end'].max(),
            'window_start': seq_windows['window_start'].iloc[-1],  # Last window in sequence

            # Aggregated features for the sequence
            'total_flows': seq_windows['total_flows'].sum(),
            'total_packets': seq_windows['total_packets'].sum(),
            'total_bytes': seq_windows['total_bytes'].sum(),
            'avg_unique_ips': seq_windows[['unique_source_ips', 'unique_dest_ips']].values.mean(),
            'avg_port_diversity': seq_windows[['unique_source_ports', 'unique_dest_ports']].values.mean(),
            'syn_rate': seq_windows['syn_count'].sum() / max(seq_windows['total_flows'].sum(), 1),
            'tcp_ratio': seq_windows['tcp_flow_count'].sum() / max(seq_windows['total_flows'].sum(), 1),
            'attack_activity': seq_windows['window_attack_count'].sum(),
            'traffic_intensity': seq_windows['total_flows'].mean(),
        }

        # Compute volatility (std across windows)
        flow_var = seq_windows['total_flows'].std()
        pkt_var = seq_windows['total_packets'].std()
        byte_var = seq_windows['total_bytes'].std()
        seq_feat['volatility'] = np.mean([flow_var, pkt_var, byte_var]) if not pd.isna(flow_var) else 0

        # Add future targets for each horizon
        for horizon in FORECAST_HORIZONS:
            future_window_steps = horizon // WINDOW_MINUTES
            future_idx = seq_start_idx + SEQUENCE_LENGTH + future_window_steps - 1

            if future_idx < len(df):
                future_window = df.iloc[future_idx]
                seq_feat[f'attack_prob_h{horizon}'] = float(future_window['future_attack'])
                seq_feat[f'attack_ratio_h{horizon}'] = float(future_window['future_attack_ratio'])
                seq_feat[f'traffic_intensity_h{horizon}'] = float(future_window['total_flows'])
            else:
                # No future data available, use NaN to indicate target unavailable
                seq_feat[f'attack_prob_h{horizon}'] = np.nan
                seq_feat[f'attack_ratio_h{horizon}'] = 0.0
                seq_feat[f'traffic_intensity_h{horizon}'] = 0.0

        all_sequences.append(seq_feat)

    sequences_df = pd.DataFrame(all_sequences)

    # Define feature columns (only current state, not future targets)
    feature_cols = [
        'total_flows', 'total_packets', 'total_bytes',
        'avg_unique_ips', 'avg_port_diversity', 'syn_rate',
        'tcp_ratio', 'attack_activity', 'traffic_intensity', 'volatility'
    ]

    print(f"  Created {len(sequences_df)} sequences")
    print(f"  Features per sequence: {len(feature_cols)}")
    print(f"  Forecast horizons: {FORECAST_HORIZONS}")

    # Print target statistics
    for horizon in FORECAST_HORIZONS:
        col = f'attack_prob_h{horizon}'
        valid_mask = ~sequences_df[col].isna()
        if valid_mask.sum() > 0:
            print(f"  Horizon {horizon}min: {valid_mask.sum()} valid targets, {(sequences_df[col][valid_mask] > 0).sum()} positive")
        else:
            print(f"  Horizon {horizon}min: 0 valid targets")

    # Save sequences
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    sequences_df.to_parquet(output_path, index=False)
    print(f"  Saved to: {output_path}")

    return sequences_df, feature_cols, FORECAST_HORIZONS


def get_mitre_attack_stage(row):
    """Map network behavior to MITRE ATT&CK stage."""
    # Heuristic mapping based on observable behavior
    syn_rate = row.get('syn_rate', 0)
    tcp_ratio = row.get('tcp_ratio', 0)
    port_diversity = row.get('avg_port_diversity', 0)
    attack_activity = row.get('attack_activity', 0)

    # Reconnaissance: High SYN rate, port scanning patterns
    if syn_rate > 0.05 and port_diversity > 3 and tcp_ratio > 0.6:
        return "RECONNAISSANCE"

    # Initial Access: Attack activity with network flows
    elif attack_activity > 0 and row.get('total_flows', 0) > 500:
        return "INITIAL_ACCESS"

    # Command and Control: Sustained port diversity
    elif port_diversity >= 3 and tcp_ratio > 0.4:
        return "COMMAND_AND_CONTROL"

    # Exfiltration: High byte volume
    elif row.get('total_bytes', 0) > 100000:
        return "EXFILTRATION"

    # Lateral Movement: High flow count with multiple destinations
    elif row.get('total_flows', 0) > 1000 and row.get('avg_unique_ips', 0) > 2:
        return "LATERAL_MOVEMENT"

    # Unknown/Insufficient Evidence
    return "UNKNOWN"


def add_mitre_mapping(sequences_df: pd.DataFrame) -> pd.DataFrame:
    """Add MITRE ATT&CK stage mapping to sequences."""
    print("Adding MITRE ATT&CK stage mapping...")
    sequences_df['attack_stage'] = sequences_df.apply(get_mitre_attack_stage, axis=1)

    stage_dist = sequences_df['attack_stage'].value_counts()
    print(f"  Stage distribution:")
    for stage, count in stage_dist.items():
        print(f"    {stage}: {count}")

    return sequences_df


def aggregate_sequence_block(seq_windows: pd.DataFrame, seq_start_idx: int, df: pd.DataFrame):
    """Aggregate a block of consecutive windows into one sequence feature row.

    Produces the SAME features used during training so inference is consistent.
    """
    seq_feat = {
        'sequence_id': seq_start_idx,
        'seq_start': seq_windows['window_start'].min(),
        'seq_end': seq_windows['window_end'].max(),
        'window_start': seq_windows['window_start'].iloc[-1],

        'total_flows': seq_windows['total_flows'].sum(),
        'total_packets': seq_windows['total_packets'].sum(),
        'total_bytes': seq_windows['total_bytes'].sum(),
        'avg_unique_ips': seq_windows[['unique_source_ips', 'unique_dest_ips']].values.mean(),
        'avg_port_diversity': seq_windows[['unique_source_ports', 'unique_dest_ports']].values.mean(),
        'syn_rate': seq_windows['syn_count'].sum() / max(seq_windows['total_flows'].sum(), 1),
        'tcp_ratio': seq_windows['tcp_flow_count'].sum() / max(seq_windows['total_flows'].sum(), 1),
        'attack_activity': seq_windows['window_attack_count'].sum(),
        'traffic_intensity': seq_windows['total_flows'].mean(),
    }

    flow_var = seq_windows['total_flows'].std()
    pkt_var = seq_windows['total_packets'].std()
    byte_var = seq_windows['total_bytes'].std()
    seq_feat['volatility'] = np.mean([flow_var, pkt_var, byte_var]) if not pd.isna(flow_var) else 0
    return seq_feat


def build_latest_sequence(windowed_df: pd.DataFrame) -> dict:
    """Build the most-recent sequence feature block from a windowed dataframe.

    Used for fresh inference on an uploaded CSV: takes the LAST SEQUENCE_LENGTH
    windows as the current network-state history S(t-k)..S(t).
    Returns a single feature dict (with MITRE stage) or None if not enough windows.
    """
    df = windowed_df.sort_values('window_start').reset_index(drop=True)
    if len(df) < SEQUENCE_LENGTH:
        return None
    block = df.iloc[len(df) - SEQUENCE_LENGTH:]
    feat = aggregate_sequence_block(block, len(df) - SEQUENCE_LENGTH, df)
    feat['attack_stage'] = get_mitre_attack_stage(feat)
    return feat


def create_sequential_dataset(input_path: str, output_path: str):
    """Full pipeline: windowed data -> sequences -> MITRE mapping."""
    df, feature_cols, horizons = create_sequences_from_windows(input_path, output_path)
    df = add_mitre_mapping(df)

    # Save final dataset
    final_path = output_path.replace('_sequences', '')
    df.to_parquet(final_path, index=False)
    print(f"  Saved final dataset to: {final_path}")

    return df, feature_cols, horizons


if __name__ == "__main__":
    input_file = "data/processed/windowed_data.parquet"
    output_file = "data/processed/windowed_sequences.parquet"
    create_sequential_dataset(input_file, output_file)