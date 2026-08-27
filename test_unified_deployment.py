import sys
from fastapi.testclient import TestClient
from app import app

with TestClient(app) as client:
    print("Testing root '/' (SPA serving)...")
    r_root = client.get("/")
    assert r_root.status_code == 200, f"Root failed: {r_root.status_code}"
    assert "<!doctype html>" in r_root.text.lower() or "<html" in r_root.text.lower(), "Root didn't return HTML"
    print("Root '/' returned index.html PASS")

    print("Testing direct '/health'...")
    r_health = client.get("/health")
    assert r_health.status_code == 200, f"/health failed: {r_health.status_code}"
    data_health = r_health.json()
    assert data_health["status"] == "healthy", f"Health degraded: {data_health}"
    print("Direct '/health' PASS")

    print("Testing prefixed '/api/health'...")
    r_api_health = client.get("/api/health")
    assert r_api_health.status_code == 200, f"/api/health failed: {r_api_health.status_code}"
    assert r_api_health.json()["status"] == "healthy", "/api/health mismatch"
    print("Prefixed '/api/health' PASS")

    print("Testing direct '/benchmarks' and '/api/benchmarks'...")
    r_bench = client.get("/benchmarks")
    r_api_bench = client.get("/api/benchmarks")
    assert r_bench.status_code == 200 and r_api_bench.status_code == 200, "Benchmarks failed"
    assert "world_model" in r_api_bench.json(), "World model missing in benchmarks"
    print("Benchmarks PASS")

    print("Testing '/api/predict'...")
    dummy_features = {
        "total_flows": 100.0, "total_packets": 500.0, "total_bytes": 50000.0,
        "unique_source_ips": 10.0, "unique_dest_ips": 10.0,
        "unique_source_ports": 50.0, "unique_dest_ports": 5.0,
        "tcp_flow_count": 80.0, "udp_flow_count": 20.0,
        "syn_count": 10.0, "ack_count": 40.0, "rst_count": 0.0,
        "fin_count": 5.0, "psh_count": 20.0, "urg_count": 0.0,
        "avg_flow_duration": 1000.0, "max_flow_duration": 5000.0, "std_flow_duration": 200.0,
        "avg_packet_size": 250.0, "max_packet_size": 1500.0, "min_packet_size": 40.0, "std_packet_size": 100.0,
        "avg_flow_bytes_per_sec": 500.0, "avg_flow_packets_per_sec": 5.0,
        "avg_fwd_packets": 2.5, "avg_bwd_packets": 2.5,
        "avg_fwd_bytes": 250.0, "avg_bwd_bytes": 250.0,
        "avg_flow_iat_mean": 50.0, "avg_fwd_iat_mean": 50.0, "avg_bwd_iat_mean": 50.0,
        "avg_active_mean": 0.0, "avg_idle_mean": 0.0,
        "avg_subflow_fwd_pkts": 2.5, "avg_subflow_bwd_pkts": 2.5
    }
    r_pred = client.post("/api/predict", json={"features": dummy_features, "threshold": 0.5})
    assert r_pred.status_code == 200, f"Predict failed: {r_pred.status_code}"
    assert "attack_probability" in r_pred.json(), "Prediction missing attack_probability"
    print("Predict PASS")

    print("Testing '/api/rollout'...")
    r_roll = client.post("/api/rollout", json={"features": dummy_features, "threshold": 0.5})
    assert r_roll.status_code == 200, f"Rollout failed: {r_roll.status_code}"
    assert "trajectory" in r_roll.json(), "Rollout missing trajectory"
    print("Rollout PASS")

    print("ALL UNIFIED DEPLOYMENT TESTS PASSED SUCCESSFULLY!")
