"""
Centralized Schema Detection and Normalization Layer for Network Telemetry CSVs.

Supports heterogeneous network flow exports (CIC-IDS2017, CIC-IDS2018, NetFlow,
Zeek/Bro, Suricata, and custom firewall/IDS CSV dumps) by matching column variations
and aliases into standard canonical feature names.
"""
from typing import Dict, List, Tuple, Optional, Any
import re
import pandas as pd


# Canonical column definitions required by the feature windowing pipeline
CANONICAL_COLUMNS = [
    'Timestamp',
    'Source IP',
    'Destination IP',
    'Source Port',
    'Destination Port',
    'Protocol',
    'Flow Duration',
    'Total Fwd Packets',
    'Total Backward Packets',
    'Total Length of Fwd Packets',
    'Total Length of Bwd Packets',
    'SYN Flag Count',
    'ACK Flag Count',
    'RST Flag Count',
    'FIN Flag Count',
    'PSH Flag Count',
    'URG Flag Count',
    'Average Packet Size',
    'Max Packet Length',
    'Min Packet Length',
    'Packet Length Std',
    'Flow Bytes/s',
    'Flow Packets/s',
    'Flow IAT Mean',
    'Fwd IAT Mean',
    'Bwd IAT Mean',
    'Active Mean',
    'Idle Mean',
    'Subflow Fwd Packets',
    'Subflow Bwd Packets',
    'Label',
]

# Minimal critical columns strictly required to create temporal state windows
MINIMAL_REQUIRED_COLUMNS = [
    'Timestamp',
    'Source IP',
    'Destination IP',
    'Source Port',
    'Destination Port',
    'Protocol',
    'Flow Duration',
    'Total Fwd Packets',
    'Total Backward Packets',
]

# Comprehensive alias dictionary mapping variations -> canonical name
COLUMN_ALIASES: Dict[str, List[str]] = {
    'Timestamp': [
        'timestamp', 'time', 'date_time', 'datetime', 'flow_start', 'flow_start_time',
        'start_time', 'flow timestamp', 'frame.time', 'ts', 'epoch'
    ],
    'Source IP': [
        'source ip', 'src ip', 'src_ip', 'source_ip', 'srcip', 'sourceip',
        'ip_src', 'client_ip', 'orig_h', 'saddr', 'src'
    ],
    'Destination IP': [
        'destination ip', 'dest ip', 'dst ip', 'dst_ip', 'destination_ip', 'dstip',
        'destinationip', 'ip_dst', 'server_ip', 'resp_h', 'daddr', 'dst'
    ],
    'Source Port': [
        'source port', 'src port', 'src_port', 'source_port', 'srcport', 'sport',
        'orig_p', 's_port', 'l4_src_port'
    ],
    'Destination Port': [
        'destination port', 'dest port', 'dst port', 'dst_port', 'destination_port',
        'dstport', 'dport', 'resp_p', 'd_port', 'l4_dst_port'
    ],
    'Protocol': [
        'protocol', 'proto', 'ip_proto', 'transport_protocol', 'l4_proto'
    ],
    'Flow Duration': [
        'flow duration', 'flow_duration', 'duration', 'dur', 'flow_dur', 'session_duration'
    ],
    'Total Fwd Packets': [
        'total fwd packets', 'tot fwd pkts', 'total_fwd_packets', 'fwd_packets',
        'fwd_pkts', 'tot_fwd_pkts', 'src_packets', 'out_pkts', 'fwd_pkt_count'
    ],
    'Total Backward Packets': [
        'total backward packets', 'total bwd packets', 'tot bwd pkts',
        'total_backward_packets', 'total_bwd_packets', 'bwd_packets', 'bwd_pkts',
        'tot_bwd_pkts', 'dst_packets', 'in_pkts', 'bwd_pkt_count'
    ],
    'Total Length of Fwd Packets': [
        'total length of fwd packets', 'totlen fwd pkts', 'total_length_of_fwd_packets',
        'fwd_bytes', 'tot_fwd_bytes', 'fwd_payload_bytes', 'src_bytes', 'out_bytes'
    ],
    'Total Length of Bwd Packets': [
        'total length of bwd packets', 'totlen bwd pkts', 'total_length_of_bwd_packets',
        'bwd_bytes', 'tot_bwd_bytes', 'bwd_payload_bytes', 'dst_bytes', 'in_bytes'
    ],
    'SYN Flag Count': [
        'syn flag count', 'syn flag cnt', 'syn flags', 'syn_flag_count', 'syn_count',
        'tcp_syn', 'flags_syn', 'syn'
    ],
    'ACK Flag Count': [
        'ack flag count', 'ack flag cnt', 'ack flags', 'ack_flag_count', 'ack_count',
        'tcp_ack', 'flags_ack', 'ack'
    ],
    'RST Flag Count': [
        'rst flag count', 'rst flag cnt', 'rst flags', 'rst_flag_count', 'rst_count',
        'tcp_rst', 'flags_rst', 'rst'
    ],
    'FIN Flag Count': [
        'fin flag count', 'fin flag cnt', 'fin flags', 'fin_flag_count', 'fin_count',
        'tcp_fin', 'flags_fin', 'fin'
    ],
    'PSH Flag Count': [
        'psh flag count', 'psh flag cnt', 'psh flags', 'psh_flag_count', 'psh_count',
        'tcp_psh', 'flags_psh', 'psh'
    ],
    'URG Flag Count': [
        'urg flag count', 'urg flag cnt', 'urg flags', 'urg_flag_count', 'urg_count',
        'tcp_urg', 'flags_urg', 'urg'
    ],
    'Average Packet Size': [
        'average packet size', 'pkt size avg', 'average_packet_size', 'avg_packet_size',
        'avg_pkt_size', 'mean_packet_size', 'packet_size_mean', 'packet length mean'
    ],
    'Max Packet Length': [
        'max packet length', 'pkt len max', 'max_packet_length', 'max_pkt_len',
        'packet_size_max', 'max_packet_size', 'fwd packet length max'
    ],
    'Min Packet Length': [
        'min packet length', 'pkt len min', 'min_packet_length', 'min_pkt_len',
        'packet_size_min', 'min_packet_size', 'fwd packet length min'
    ],
    'Packet Length Std': [
        'packet length std', 'pkt len std', 'packet_length_std', 'pkt_len_std',
        'packet length variance', 'packet_size_std'
    ],
    'Flow Bytes/s': [
        'flow bytes/s', 'flow_bytes/s', 'flow_byts_s', 'flow bytes per sec',
        'flow_bytes_per_sec', 'bytes_per_sec'
    ],
    'Flow Packets/s': [
        'flow packets/s', 'flow_packets/s', 'flow_pkts_s', 'flow packets per sec',
        'flow_packets_per_sec', 'packets_per_sec'
    ],
    'Flow IAT Mean': [
        'flow iat mean', 'flow_iat_mean', 'flow_iat_avg', 'iat_mean', 'flow_inter_arrival_mean'
    ],
    'Fwd IAT Mean': [
        'fwd iat mean', 'fwd_iat_mean', 'fwd_iat_avg', 'fwd_inter_arrival_mean'
    ],
    'Bwd IAT Mean': [
        'bwd iat mean', 'bwd_iat_mean', 'bwd_iat_avg', 'bwd_inter_arrival_mean'
    ],
    'Active Mean': [
        'active mean', 'active_mean', 'active_avg', 'flow_active_mean'
    ],
    'Idle Mean': [
        'idle mean', 'idle_mean', 'idle_avg', 'flow_idle_mean'
    ],
    'Subflow Fwd Packets': [
        'subflow fwd packets', 'subflow_fwd_pkts', 'subflow fwd pkts', 'subflow_fwd_packets'
    ],
    'Subflow Bwd Packets': [
        'subflow bwd packets', 'subflow_bwd_pkts', 'subflow bwd pkts', 'subflow_bwd_packets'
    ],
    'Label': [
        'label', 'attack', 'class', 'target', 'classification', 'attack_type', 'threat_type'
    ],
}


def _normalize_name(name: str) -> str:
    """Strip whitespace, quotes, punctuation, and lowercase."""
    return re.sub(r'[\s_\-\.\"\']+', ' ', str(name).strip().lower())


def detect_column_mappings(columns: List[str]) -> Tuple[Dict[str, str], List[str], List[str]]:
    """
    Match raw CSV columns against canonical names.

    Returns:
        (mapped_dict: raw_col -> canonical_col,
         detected_canonical: list of found canonical columns,
         missing_critical: list of minimal critical columns that could not be mapped)
    """
    normalized_raw = {col: _normalize_name(col) for col in columns}
    mapped: Dict[str, str] = {}
    detected_canonical = set()

    for canonical, aliases in COLUMN_ALIASES.items():
        norm_aliases = [_normalize_name(a) for a in aliases]
        norm_canonical = _normalize_name(canonical)

        matched_raw = None
        # 1. Exact match with canonical
        for raw, norm in normalized_raw.items():
            if norm == norm_canonical and raw not in mapped:
                matched_raw = raw
                break

        # 2. Alias match
        if not matched_raw:
            for raw, norm in normalized_raw.items():
                if norm in norm_aliases and raw not in mapped:
                    matched_raw = raw
                    break

        # 3. Substring match for robust prefix/suffix
        if not matched_raw:
            for raw, norm in normalized_raw.items():
                if raw in mapped:
                    continue
                for alias in norm_aliases:
                    if len(alias) >= 5 and (alias in norm or norm in alias):
                        matched_raw = raw
                        break
                if matched_raw:
                    break

        if matched_raw:
            mapped[matched_raw] = canonical
            detected_canonical.add(canonical)

    missing_critical = [c for c in MINIMAL_REQUIRED_COLUMNS if c not in detected_canonical]
    return mapped, sorted(list(detected_canonical)), missing_critical


def standardize_dataframe(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Standardize a DataFrame's columns into canonical format.
    Fills missing optional flow features with valid defaults and handles unlabeled inference data.

    Raises:
        ValueError if minimal required columns are missing.
    """
    raw_cols = list(df.columns)
    col_mapping, detected, missing_critical = detect_column_mappings(raw_cols)

    if missing_critical:
        diagnostics = {
            "compatible": False,
            "detected_columns": detected,
            "missing_required": missing_critical,
            "raw_columns": raw_cols[:20],
            "error": f"CSV detected, but missing critical flow columns: {', '.join(missing_critical)}"
        }
        raise ValueError(diagnostics["error"])

    # Rename mapped columns
    df_clean = df.rename(columns=col_mapping)

    # If Label column is absent (unlabeled inference CSV), inject standard BENIGN placeholder
    if 'Label' not in df_clean.columns:
        df_clean['Label'] = 'BENIGN'

    # Fill any missing optional canonical columns with mathematical defaults
    if 'Total Length of Fwd Packets' not in df_clean.columns:
        df_clean['Total Length of Fwd Packets'] = df_clean.get('Total Fwd Packets', 1) * 64
    if 'Total Length of Bwd Packets' not in df_clean.columns:
        df_clean['Total Length of Bwd Packets'] = df_clean.get('Total Backward Packets', 1) * 64

    for flag in ['SYN Flag Count', 'ACK Flag Count', 'RST Flag Count', 'FIN Flag Count', 'PSH Flag Count', 'URG Flag Count']:
        if flag not in df_clean.columns:
            df_clean[flag] = 0

    if 'Average Packet Size' not in df_clean.columns:
        tot_pkts = df_clean['Total Fwd Packets'] + df_clean['Total Backward Packets']
        tot_bytes = df_clean['Total Length of Fwd Packets'] + df_clean['Total Length of Bwd Packets']
        df_clean['Average Packet Size'] = (tot_bytes / tot_pkts.replace(0, 1)).fillna(64.0)

    if 'Max Packet Length' not in df_clean.columns:
        df_clean['Max Packet Length'] = df_clean['Average Packet Size'] * 1.5
    if 'Min Packet Length' not in df_clean.columns:
        df_clean['Min Packet Length'] = 40.0
    if 'Packet Length Std' not in df_clean.columns:
        df_clean['Packet Length Std'] = 0.0

    if 'Flow Bytes/s' not in df_clean.columns:
        dur_sec = df_clean['Flow Duration'].replace(0, 1) / 1e6
        tot_bytes = df_clean['Total Length of Fwd Packets'] + df_clean['Total Length of Bwd Packets']
        df_clean['Flow Bytes/s'] = (tot_bytes / dur_sec).fillna(0.0)

    if 'Flow Packets/s' not in df_clean.columns:
        dur_sec = df_clean['Flow Duration'].replace(0, 1) / 1e6
        tot_pkts = df_clean['Total Fwd Packets'] + df_clean['Total Backward Packets']
        df_clean['Flow Packets/s'] = (tot_pkts / dur_sec).fillna(0.0)

    for iat_col in ['Flow IAT Mean', 'Fwd IAT Mean', 'Bwd IAT Mean', 'Active Mean', 'Idle Mean']:
        if iat_col not in df_clean.columns:
            df_clean[iat_col] = 0.0

    if 'Subflow Fwd Packets' not in df_clean.columns:
        df_clean['Subflow Fwd Packets'] = df_clean['Total Fwd Packets']
    if 'Subflow Bwd Packets' not in df_clean.columns:
        df_clean['Subflow Bwd Packets'] = df_clean['Total Backward Packets']

    diagnostics = {
        "compatible": True,
        "mapped_count": len(col_mapping),
        "detected_canonical": detected,
        "total_rows": len(df_clean)
    }

    return df_clean, diagnostics


def test_schemas():
    """Unit test verifying schema detection across diverse column naming styles."""
    test_cases = [
        {
            "name": "Standard CIC-IDS2017",
            "columns": [' Source IP', ' Destination IP', ' Source Port', ' Destination Port',
                        ' Protocol', ' Timestamp', ' Flow Duration', ' Total Fwd Packets',
                        ' Total Backward Packets', ' Label']
        },
        {
            "name": "Snake Case Telemetry",
            "columns": ['src_ip', 'dst_ip', 'src_port', 'dst_port', 'proto', 'timestamp',
                        'flow_duration', 'fwd_packets', 'bwd_packets', 'attack_type']
        },
        {
            "name": "CamelCase / Unlabeled Network Export",
            "columns": ['client_ip', 'server_ip', 'sport', 'dport', 'protocol', 'time',
                        'duration', 'out_pkts', 'in_pkts']
        }
    ]

    for tc in test_cases:
        mapped, detected, missing = detect_column_mappings(tc["columns"])
        assert len(missing) == 0, f"Failed on {tc['name']}: Missing {missing}"
        print(f"PASS: {tc['name']} -> Mapped {len(mapped)} columns")

    # Incompatible schema test
    bad_columns = ['Name', 'Age', 'Salary', 'Department']
    _, _, bad_missing = detect_column_mappings(bad_columns)
    assert len(bad_missing) > 0, "Incompatible columns should fail validation"
    print(f"PASS: Incompatible schema detected -> Missing required: {bad_missing}")


if __name__ == '__main__':
    test_schemas()
