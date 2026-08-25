"""
Packet-level feature extraction test.

STATUS: The repository contains only FLOW-LEVEL CIC-IDS2017 CSV data.
No PCAP file is available, so packet-level extraction is NOT TESTED here.
This test only verifies that the optional module imports cleanly and reports
its (unavailable) support status without fabricating any packet values.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.data import packet_features as pf


def test_packet_module_imports():
    # Module must import without scapy installed (scapy is optional)
    assert hasattr(pf, 'extract_packet_features')
    assert hasattr(pf, 'supported')
    assert hasattr(pf, 'PACKET_FEATURES')
    print(f"  packet extraction supported in this env: {pf.supported()}")
    print(f"  packet features schema: {pf.PACKET_FEATURES}")


def test_no_fabricated_values():
    # Without a PCAP, extraction must raise, never invent numbers.
    raised = False
    try:
        pf.extract_packet_features("data/raw/does_not_exist.pcap")
    except (FileNotFoundError, RuntimeError):
        raised = True
    assert raised, "extraction should fail loudly without input, not fabricate data"
    print("  extraction refused to fabricate data on missing input: OK")


if __name__ == "__main__":
    test_packet_module_imports()
    test_no_fabricated_values()
    print("\nPACKET-LEVEL TESTS PASSED (NOT TESTED against real PCAP - none available)")
