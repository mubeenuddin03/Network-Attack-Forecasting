"""
Optional packet-level feature extraction for the SIH pipeline.

The current repository only contains FLOW-LEVEL CIC-IDS2017 CSV data.
This module provides a clean, optional interface to extract PACKET-LEVEL
features from a PCAP capture when one is available. It is intentionally
decoupled from the training/inference path so it does not add a required
dependency for the flow-level model.

STATUS: NOT TESTED - NO PCAP AVAILABLE in this repository.
The functions are implemented but are only exercised if a real .pcap file
is supplied. No packet values are fabricated.
"""
from pathlib import Path
from typing import Dict, Optional


# Packet-level features we can derive if a PCAP is provided.
PACKET_FEATURES = [
    'pkt_count',
    'ttl_mean',
    'ttl_variance',
    'tcp_window_mean',
    'fragmentation_count',
    'retransmission_count',
    'payload_size_mean',
    'inter_arrival_mean',
    'syn_packet_ratio',
    'unique_dst_ports',
]


def extract_packet_features(pcap_path: str) -> Dict[str, float]:
    """Extract packet-level features from a PCAP file.

    Uses scapy if installed. Returns a dict of packet-level statistics.
    Raises RuntimeError if scapy is not installed or the file is missing.
    """
    if not Path(pcap_path).exists():
        raise FileNotFoundError(f"PCAP not found: {pcap_path}")

    try:
        from scapy.all import rdpcap, TCP, IP
    except ImportError:
        raise RuntimeError(
            "scapy is required for packet-level extraction. "
            "Install with: pip install scapy  (optional, not needed for flow-level model)"
        )

    packets = rdpcap(pcap_path)
    ttls, windows, payloads, iats = [], [], [], []
    frag, retrans, syn, tcp = 0, 0, 0, 0
    dst_ports = set()
    prev_time = None

    for pkt in packets:
        if IP in pkt:
            ttls.append(pkt[IP].ttl)
        if TCP in pkt:
            tcp += 1
            windows.append(pkt[TCP].window)
            if pkt[TCP].flags & 0x02:  # SYN
                syn += 1
            if pkt[TCP].flags & 0x10:  # ACK (approx retransmission heuristic)
                retrans += 1
            if pkt[TCP].flags & 0x01:  # FIN fragment-ish flag carrier
                pass
            dst_ports.add(pkt[TCP].dport)
            payloads.append(len(pkt[TCP].payload))
        if pkt.frag:  # IP fragmentation
            frag += 1
        if prev_time is not None:
            iats.append(float(pkt.time - prev_time))
        prev_time = pkt.time

    def safe_mean(x):
        return float(np_mean(x)) if x else 0.0

    def safe_var(x):
        return float(np_var(x)) if len(x) > 1 else 0.0

    return {
        'pkt_count': float(len(packets)),
        'ttl_mean': safe_mean(ttls),
        'ttl_variance': safe_var(ttls),
        'tcp_window_mean': safe_mean(windows),
        'fragmentation_count': float(frag),
        'retransmission_count': float(retrans),
        'payload_size_mean': safe_mean(payloads),
        'inter_arrival_mean': safe_mean(iats),
        'syn_packet_ratio': (syn / tcp) if tcp else 0.0,
        'unique_dst_ports': float(len(dst_ports)),
    }


def np_mean(x):
    return sum(x) / len(x)


def np_var(x):
    m = sum(x) / len(x)
    return sum((v - m) ** 2 for v in x) / (len(x) - 1)


def supported() -> bool:
    """Whether packet-level extraction can run in this environment."""
    try:
        import scapy  # noqa: F401
        return True
    except ImportError:
        return False
