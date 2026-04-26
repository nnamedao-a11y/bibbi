#!/usr/bin/env python3
"""
Backend API Testing for Phase 8 - Extension Registry + Event-driven Scraping + Health-based Routing
=====================================================================================================

Tests all new /api/ext/* endpoints for Phase 8 features:
1. Multi-client extension registry with online/offline tracking
2. Event-driven push warming where extensions cache observations
3. Health-based routing that skips degraded sources

New endpoints to test:
- POST /api/ext/register - extension registration
- POST /api/ext/heartbeat - keep-alive mechanism  
- GET /api/ext/clients - list registered clients
- POST /api/ext/observation - cache observations for instant reads
- GET /api/ext/observation/{vin} - read cached observations
- GET /api/ext/degraded - health-based routing info
- Updated GET /api/ext/health - with new fields

Plus regression testing of all existing endpoints from iteration_1.
"""

import asyncio
import json
import sys
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

# Configuration
BASE_URL = "https://car-dealer-pro-7.preview.emergentagent.com"
TIMEOUT = 30.0

# Test VINs
REAL_VIN_1 = "2C3CDZFJ0MH580278"  # Real VIN, should be found on auctionauto
REAL_VIN_2 = "5YJSA1E25HF199047"  # Real Tesla, should be found on auctionauto
SYNTHETIC_VIN = "1HGCM82633A123456"  # Synthetic, should miss
INVALID_VIN = "INVALID123"  # Invalid VIN length
TEST_VIN_17_CHAR = "WAUSPBFF7HA146992"  # Valid 17-char VIN for observation tests
SHORT_VIN = "WAUSPBFF7HA14"  # Invalid short VIN for error testing

class Phase8Tester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip('/')
        self.client = httpx.AsyncClient(timeout=TIMEOUT)
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.test_client_id = None  # Will store registered client ID

    async def close(self):
        await self.client.aclose()

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    # ═══════════════════════════════════════════════════════════════════
    # PHASE 8 NEW ENDPOINT TESTS
    # ═══════════════════════════════════════════════════════════════════

    async def test_ext_register_with_client_id(self):
        """Test POST /api/ext/register with client_id, label, version, capabilities"""
        print("\n🔍 Testing Extension Registration with client_id...")
        
        try:
            # Generate unique client ID for this test session
            self.test_client_id = str(uuid.uuid4())
            
            payload = {
                "client_id": self.test_client_id,
                "label": "Test Extension",
                "version": "1.0.0",
                "capabilities": ["poctra", "carsfromwest", "autoauctionhistory"]
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/ext/register",
                json=payload
            )
            
            if response.status_code != 200:
                self.log_test("Extension register status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension register status", True)
            
            try:
                data = response.json()
            except Exception as e:
                self.log_test("Extension register JSON", False, f"Invalid JSON: {e}")
                return
            
            self.log_test("Extension register JSON", True)
            
            # Check response structure
            if not data.get("ok"):
                self.log_test("Extension register ok:true", False, f"Expected ok:true, got {data.get('ok')}")
                return
            
            self.log_test("Extension register ok:true", True)
            
            # Check client data
            client_data = data.get("client", {})
            
            if client_data.get("client_id") != self.test_client_id:
                self.log_test("Extension register client_id", False, f"Client ID mismatch")
            else:
                self.log_test("Extension register client_id", True)
            
            # Check capabilities are sorted
            capabilities = client_data.get("capabilities", [])
            expected_sorted = ["autoauctionhistory", "carsfromwest", "poctra"]
            if capabilities == expected_sorted:
                self.log_test("Extension register capabilities sorted", True)
            else:
                self.log_test("Extension register capabilities sorted", False, f"Expected {expected_sorted}, got {capabilities}")
            
            # Check online status
            if client_data.get("online") == True:
                self.log_test("Extension register online:true", True)
            else:
                self.log_test("Extension register online:true", False, f"Expected online:true, got {client_data.get('online')}")
            
            # Check last_seen_at exists
            if "last_seen_at" in client_data:
                self.log_test("Extension register last_seen_at", True)
            else:
                self.log_test("Extension register last_seen_at", False, "Missing last_seen_at")
            
            print(f"📊 Register response: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test("Extension register", False, f"Exception: {e}")

    async def test_ext_register_idempotent(self):
        """Test POST /api/ext/register is idempotent - second call updates not duplicates"""
        print("\n🔍 Testing Extension Registration idempotency...")
        
        if not self.test_client_id:
            self.log_test("Extension register idempotent", False, "No client_id from previous test")
            return
        
        try:
            # Second registration with same client_id but different data
            payload = {
                "client_id": self.test_client_id,
                "label": "Updated Test Extension",
                "version": "1.1.0",
                "capabilities": ["poctra", "salvagebid"]  # Different capabilities
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/ext/register",
                json=payload
            )
            
            if response.status_code != 200:
                self.log_test("Extension register idempotent status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension register idempotent status", True)
            
            data = response.json()
            
            if not data.get("ok"):
                self.log_test("Extension register idempotent ok", False, f"Expected ok:true, got {data.get('ok')}")
                return
            
            self.log_test("Extension register idempotent ok", True)
            
            # Check updated data
            client_data = data.get("client", {})
            
            if client_data.get("label") == "Updated Test Extension":
                self.log_test("Extension register idempotent label updated", True)
            else:
                self.log_test("Extension register idempotent label updated", False, f"Label not updated: {client_data.get('label')}")
            
            if client_data.get("version") == "1.1.0":
                self.log_test("Extension register idempotent version updated", True)
            else:
                self.log_test("Extension register idempotent version updated", False, f"Version not updated: {client_data.get('version')}")
            
            # Check capabilities updated and sorted
            capabilities = client_data.get("capabilities", [])
            expected_sorted = ["poctra", "salvagebid"]
            if capabilities == expected_sorted:
                self.log_test("Extension register idempotent capabilities updated", True)
            else:
                self.log_test("Extension register idempotent capabilities updated", False, f"Expected {expected_sorted}, got {capabilities}")
            
        except Exception as e:
            self.log_test("Extension register idempotent", False, f"Exception: {e}")

    async def test_ext_register_without_client_id(self):
        """Test POST /api/ext/register without client_id returns 400"""
        print("\n🔍 Testing Extension Registration without client_id...")
        
        try:
            payload = {
                "label": "Test Extension",
                "version": "1.0.0",
                "capabilities": ["poctra"]
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/ext/register",
                json=payload
            )
            
            if response.status_code == 400:
                self.log_test("Extension register no client_id 400", True)
            else:
                self.log_test("Extension register no client_id 400", False, f"Expected 400, got {response.status_code}")
            
        except Exception as e:
            self.log_test("Extension register no client_id", False, f"Exception: {e}")

    async def test_ext_heartbeat(self):
        """Test POST /api/ext/heartbeat with client_id and online:true"""
        print("\n🔍 Testing Extension Heartbeat...")
        
        if not self.test_client_id:
            self.log_test("Extension heartbeat", False, "No client_id from previous test")
            return
        
        try:
            payload = {
                "client_id": self.test_client_id,
                "online": True
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/ext/heartbeat",
                json=payload
            )
            
            if response.status_code != 200:
                self.log_test("Extension heartbeat status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension heartbeat status", True)
            
            data = response.json()
            
            if not data.get("ok"):
                self.log_test("Extension heartbeat ok", False, f"Expected ok:true, got {data.get('ok')}")
                return
            
            self.log_test("Extension heartbeat ok", True)
            
            # Check refreshed last_seen_at
            client_data = data.get("client", {})
            if "last_seen_at" in client_data:
                self.log_test("Extension heartbeat refreshed last_seen_at", True)
            else:
                self.log_test("Extension heartbeat refreshed last_seen_at", False, "Missing last_seen_at")
            
        except Exception as e:
            self.log_test("Extension heartbeat", False, f"Exception: {e}")

    async def test_ext_heartbeat_auto_register(self):
        """Test POST /api/ext/heartbeat auto-registers unknown client_id"""
        print("\n🔍 Testing Extension Heartbeat auto-registration...")
        
        try:
            unknown_client_id = str(uuid.uuid4())
            payload = {
                "client_id": unknown_client_id,
                "online": True
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/ext/heartbeat",
                json=payload
            )
            
            if response.status_code != 200:
                self.log_test("Extension heartbeat auto-register status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension heartbeat auto-register status", True)
            
            data = response.json()
            
            if not data.get("ok"):
                self.log_test("Extension heartbeat auto-register ok", False, f"Expected ok:true, got {data.get('ok')}")
                return
            
            self.log_test("Extension heartbeat auto-register ok", True)
            
            # Check client was auto-registered
            client_data = data.get("client", {})
            if client_data.get("client_id") == unknown_client_id:
                self.log_test("Extension heartbeat auto-register client_id", True)
            else:
                self.log_test("Extension heartbeat auto-register client_id", False, f"Client ID mismatch")
            
        except Exception as e:
            self.log_test("Extension heartbeat auto-register", False, f"Exception: {e}")

    async def test_ext_clients(self):
        """Test GET /api/ext/clients returns client list with proper structure"""
        print("\n🔍 Testing Extension Clients list...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/ext/clients")
            
            if response.status_code != 200:
                self.log_test("Extension clients status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension clients status", True)
            
            data = response.json()
            
            # Check required fields
            required_fields = ["total", "online", "offline", "clients"]
            for field in required_fields:
                if field not in data:
                    self.log_test(f"Extension clients {field} field", False, f"Missing {field}")
                    return
            
            self.log_test("Extension clients required fields", True)
            
            # After registering one client, total should be >= 1
            total = data.get("total", 0)
            if total >= 1:
                self.log_test("Extension clients total>=1", True, f"Total: {total}")
            else:
                self.log_test("Extension clients total>=1", False, f"Expected >=1, got {total}")
            
            # Check online count
            online = data.get("online", 0)
            if online >= 1:
                self.log_test("Extension clients online>=1", True, f"Online: {online}")
            else:
                self.log_test("Extension clients online>=1", False, f"Expected >=1, got {online}")
            
            # Check clients array structure
            clients = data.get("clients", [])
            if isinstance(clients, list):
                self.log_test("Extension clients array", True, f"Found {len(clients)} clients")
                
                # Check first client structure if exists
                if clients:
                    client = clients[0]
                    required_client_fields = ["client_id", "capabilities", "online", "age_sec", "label", "version", "jobs_received", "observations_pushed"]
                    missing_fields = [f for f in required_client_fields if f not in client]
                    if not missing_fields:
                        self.log_test("Extension clients structure", True)
                    else:
                        self.log_test("Extension clients structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Extension clients structure", False, "No clients to check structure")
            else:
                self.log_test("Extension clients array", False, f"Expected array, got {type(clients)}")
            
            print(f"📊 Clients data: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test("Extension clients", False, f"Exception: {e}")

    async def test_ext_observation_push(self):
        """Test POST /api/ext/observation with valid observation data"""
        print("\n🔍 Testing Extension Observation push...")
        
        try:
            payload = {
                "client_id": self.test_client_id or "test-client",
                "source": "poctra",
                "vin": TEST_VIN_17_CHAR,
                "title": "2018 BMW X5 xDrive40e",
                "year": 2018,
                "make": "BMW",
                "model": "X5",
                "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
                "sold_price_usd": 25000
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/ext/observation",
                json=payload
            )
            
            if response.status_code != 200:
                self.log_test("Extension observation push status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension observation push status", True)
            
            data = response.json()
            
            if not data.get("ok"):
                self.log_test("Extension observation push ok", False, f"Expected ok:true, got {data.get('ok')}")
                return
            
            self.log_test("Extension observation push ok", True)
            
            # Check VIN is uppercased
            if data.get("vin") == TEST_VIN_17_CHAR.upper():
                self.log_test("Extension observation push VIN uppercased", True)
            else:
                self.log_test("Extension observation push VIN uppercased", False, f"Expected {TEST_VIN_17_CHAR.upper()}, got {data.get('vin')}")
            
            # Check source
            if data.get("source") == "poctra":
                self.log_test("Extension observation push source", True)
            else:
                self.log_test("Extension observation push source", False, f"Expected poctra, got {data.get('source')}")
            
            # Check stored count
            stored = data.get("stored", 0)
            if stored >= 1:
                self.log_test("Extension observation push stored>=1", True, f"Stored: {stored}")
            else:
                self.log_test("Extension observation push stored>=1", False, f"Expected >=1, got {stored}")
            
            print(f"📊 Observation push response: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test("Extension observation push", False, f"Exception: {e}")

    async def test_ext_observation_push_short_vin(self):
        """Test POST /api/ext/observation with VIN shorter than 17 chars returns 400"""
        print("\n🔍 Testing Extension Observation push with short VIN...")
        
        try:
            payload = {
                "client_id": self.test_client_id or "test-client",
                "source": "poctra",
                "vin": SHORT_VIN,  # Only 13 chars
                "title": "Test Vehicle"
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/ext/observation",
                json=payload
            )
            
            if response.status_code == 400:
                self.log_test("Extension observation push short VIN 400", True)
            else:
                self.log_test("Extension observation push short VIN 400", False, f"Expected 400, got {response.status_code}")
            
        except Exception as e:
            self.log_test("Extension observation push short VIN", False, f"Exception: {e}")

    async def test_ext_observation_get(self):
        """Test GET /api/ext/observation/{vin} reads back cached observation"""
        print(f"\n🔍 Testing Extension Observation get for VIN: {TEST_VIN_17_CHAR}...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/ext/observation/{TEST_VIN_17_CHAR}")
            
            if response.status_code != 200:
                self.log_test("Extension observation get status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension observation get status", True)
            
            data = response.json()
            
            # Check hit:true
            if data.get("hit") == True:
                self.log_test("Extension observation get hit:true", True)
            else:
                self.log_test("Extension observation get hit:true", False, f"Expected hit:true, got {data.get('hit')}")
                return
            
            # Check data structure
            obs_data = data.get("data", {})
            
            # Check VIN is uppercased
            if obs_data.get("vin") == TEST_VIN_17_CHAR.upper():
                self.log_test("Extension observation get VIN", True)
            else:
                self.log_test("Extension observation get VIN", False, f"VIN mismatch")
            
            # Check from_cache marker
            if obs_data.get("from_cache") == "observation":
                self.log_test("Extension observation get from_cache", True)
            else:
                self.log_test("Extension observation get from_cache", False, f"Expected 'observation', got {obs_data.get('from_cache')}")
            
            # Check sources array
            sources = obs_data.get("sources", [])
            if isinstance(sources, list) and len(sources) >= 1:
                self.log_test("Extension observation get sources", True, f"Found {len(sources)} sources")
            else:
                self.log_test("Extension observation get sources", False, f"Expected array with >=1 sources, got {sources}")
            
            print(f"📊 Observation get response: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test("Extension observation get", False, f"Exception: {e}")

    async def test_ext_observation_get_unseen(self):
        """Test GET /api/ext/observation/{unseen-vin} returns hit:false"""
        print("\n🔍 Testing Extension Observation get for unseen VIN...")
        
        try:
            unseen_vin = "UNSEEN1234567890123"  # 17 chars but not cached
            response = await self.client.get(f"{self.base_url}/api/ext/observation/{unseen_vin}")
            
            if response.status_code != 200:
                self.log_test("Extension observation get unseen status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension observation get unseen status", True)
            
            data = response.json()
            
            # Check hit:false
            if data.get("hit") == False:
                self.log_test("Extension observation get unseen hit:false", True)
            else:
                self.log_test("Extension observation get unseen hit:false", False, f"Expected hit:false, got {data.get('hit')}")
            
            # Check data is null
            if data.get("data") is None:
                self.log_test("Extension observation get unseen data:null", True)
            else:
                self.log_test("Extension observation get unseen data:null", False, f"Expected null, got {data.get('data')}")
            
        except Exception as e:
            self.log_test("Extension observation get unseen", False, f"Exception: {e}")

    async def test_ext_degraded(self):
        """Test GET /api/ext/degraded returns degraded sources list"""
        print("\n🔍 Testing Extension Degraded sources...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/ext/degraded")
            
            if response.status_code != 200:
                self.log_test("Extension degraded status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension degraded status", True)
            
            data = response.json()
            
            # Check degraded field exists and is array
            if "degraded" not in data:
                self.log_test("Extension degraded field", False, "Missing 'degraded' field")
                return
            
            self.log_test("Extension degraded field", True)
            
            degraded = data.get("degraded", [])
            if isinstance(degraded, list):
                self.log_test("Extension degraded array", True, f"Found {len(degraded)} degraded sources")
                # Initially should be empty since we haven't synthesized high latency
                if len(degraded) == 0:
                    self.log_test("Extension degraded initially empty", True)
                else:
                    self.log_test("Extension degraded initially empty", False, f"Expected empty, got {degraded}")
            else:
                self.log_test("Extension degraded array", False, f"Expected array, got {type(degraded)}")
            
            print(f"📊 Degraded sources: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test("Extension degraded", False, f"Exception: {e}")

    async def test_ext_health_new_fields(self):
        """Test GET /api/ext/health now exposes new Phase 8 fields"""
        print("\n🔍 Testing Extension Health with new Phase 8 fields...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/ext/health")
            
            if response.status_code != 200:
                self.log_test("Extension health new fields status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension health new fields status", True)
            
            data = response.json()
            
            # Check new Phase 8 fields
            new_fields = ["online_clients", "clients", "degraded_sources", "observation_cache_size", "observation_cache_vins"]
            
            for field in new_fields:
                if field not in data:
                    self.log_test(f"Extension health new field '{field}'", False, f"Missing {field}")
                else:
                    self.log_test(f"Extension health new field '{field}'", True)
            
            # Check online_clients is int
            online_clients = data.get("online_clients")
            if isinstance(online_clients, int):
                self.log_test("Extension health online_clients int", True, f"online_clients: {online_clients}")
            else:
                self.log_test("Extension health online_clients int", False, f"Expected int, got {type(online_clients)}")
            
            # Check clients is list
            clients = data.get("clients")
            if isinstance(clients, list):
                self.log_test("Extension health clients list", True, f"clients: {len(clients)} items")
            else:
                self.log_test("Extension health clients list", False, f"Expected list, got {type(clients)}")
            
            # Check degraded_sources is list
            degraded_sources = data.get("degraded_sources")
            if isinstance(degraded_sources, list):
                self.log_test("Extension health degraded_sources list", True, f"degraded_sources: {len(degraded_sources)} items")
            else:
                self.log_test("Extension health degraded_sources list", False, f"Expected list, got {type(degraded_sources)}")
            
            # Check observation cache fields are ints
            cache_size = data.get("observation_cache_size")
            cache_vins = data.get("observation_cache_vins")
            
            if isinstance(cache_size, int):
                self.log_test("Extension health observation_cache_size int", True, f"cache_size: {cache_size}")
            else:
                self.log_test("Extension health observation_cache_size int", False, f"Expected int, got {type(cache_size)}")
            
            if isinstance(cache_vins, int):
                self.log_test("Extension health observation_cache_vins int", True, f"cache_vins: {cache_vins}")
            else:
                self.log_test("Extension health observation_cache_vins int", False, f"Expected int, got {type(cache_vins)}")
            
            print(f"📊 Health with new fields: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test("Extension health new fields", False, f"Exception: {e}")

    # ═══════════════════════════════════════════════════════════════════
    # REGRESSION TESTS - All existing endpoints from iteration_1
    # ═══════════════════════════════════════════════════════════════════

    async def test_regression_ext_health(self):
        """Regression: Test GET /api/ext/health basic structure still works"""
        print("\n🔍 Regression: Testing Extension Health basic structure...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/ext/health")
            
            if response.status_code != 200:
                self.log_test("Regression health status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Regression health status", True)
            
            data = response.json()
            
            # Check original required fields still exist
            required_fields = ["sources", "queue_depth", "results_in_flight", "timestamp"]
            for field in required_fields:
                if field not in data:
                    self.log_test(f"Regression health {field}", False, f"Missing {field}")
                    return
            
            self.log_test("Regression health required fields", True)
            
            # Check sources structure
            sources = data.get("sources", {})
            required_sources = ["auctionauto", "poctra", "carsfromwest", "autoauctionhistory", "salvagebid"]
            
            for source in required_sources:
                if source not in sources:
                    self.log_test(f"Regression health source '{source}'", False, "Missing source")
                    continue
                
                source_data = sources[source]
                required_source_fields = ["calls", "hits", "errors", "latency_p50_ms", "latency_p95_ms", "hit_ratio", "sample_size"]
                
                missing_fields = [f for f in required_source_fields if f not in source_data]
                if missing_fields:
                    self.log_test(f"Regression health source '{source}' fields", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test(f"Regression health source '{source}' fields", True)
            
        except Exception as e:
            self.log_test("Regression health", False, f"Exception: {e}")

    async def test_regression_ext_lookup(self):
        """Regression: Test POST /api/ext/lookup still works"""
        print(f"\n🔍 Regression: Testing Extension Lookup...")
        
        try:
            payload = {"vin": REAL_VIN_1}
            start_time = time.time()
            
            response = await self.client.post(
                f"{self.base_url}/api/ext/lookup",
                json=payload
            )
            
            elapsed = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("Regression lookup status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Regression lookup status", True)
            
            # Check response time <= 6 seconds
            if elapsed <= 6.0:
                self.log_test("Regression lookup timing", True, f"Completed in {elapsed:.2f}s")
            else:
                self.log_test("Regression lookup timing", False, f"Took {elapsed:.2f}s, expected ≤6s")
            
            data = response.json()
            
            # Check required fields
            if "request_id" not in data:
                self.log_test("Regression lookup request_id", False, "Missing request_id")
            else:
                self.log_test("Regression lookup request_id", True)
            
        except Exception as e:
            self.log_test("Regression lookup", False, f"Exception: {e}")

    async def test_regression_ext_auctionauto(self):
        """Regression: Test POST /api/ext/auctionauto/test still works"""
        print(f"\n🔍 Regression: Testing AuctionAuto endpoint...")
        
        try:
            payload = {"vin": REAL_VIN_1}
            response = await self.client.post(
                f"{self.base_url}/api/ext/auctionauto/test",
                json=payload
            )
            
            if response.status_code != 200:
                self.log_test("Regression auctionauto status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Regression auctionauto status", True)
            
            data = response.json()
            
            # Check found=true
            if data.get("found"):
                self.log_test("Regression auctionauto found", True)
                
                # Check data structure
                car_data = data.get("data", {})
                if car_data.get("source") == "AUCTIONAUTO":
                    self.log_test("Regression auctionauto source", True)
                else:
                    self.log_test("Regression auctionauto source", False, f"Expected AUCTIONAUTO, got {car_data.get('source')}")
            else:
                self.log_test("Regression auctionauto found", False, "Expected found:true")
            
        except Exception as e:
            self.log_test("Regression auctionauto", False, f"Exception: {e}")

    async def test_regression_ext_jobs(self):
        """Regression: Test GET /api/ext/jobs still works"""
        print("\n🔍 Regression: Testing Extension Jobs endpoint...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/ext/jobs")
            
            if response.status_code != 200:
                self.log_test("Regression jobs status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Regression jobs status", True)
            
            data = response.json()
            
            # Check jobs field exists
            if "jobs" not in data:
                self.log_test("Regression jobs field", False, "Missing 'jobs' field")
            else:
                self.log_test("Regression jobs field", True)
                jobs = data["jobs"]
                if isinstance(jobs, list):
                    self.log_test("Regression jobs array", True, f"Found {len(jobs)} jobs")
                else:
                    self.log_test("Regression jobs array", False, f"Expected array, got {type(jobs)}")
            
        except Exception as e:
            self.log_test("Regression jobs", False, f"Exception: {e}")

    async def test_regression_ext_push(self):
        """Regression: Test POST /api/ext/push still works"""
        print("\n🔍 Regression: Testing Extension Push endpoint...")
        
        try:
            payload = {
                "request_id": "test-request-123",
                "source": "poctra",
                "vin": REAL_VIN_1,
                "title": "Test Vehicle",
                "lot": "12345"
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/ext/push",
                json=payload
            )
            
            if response.status_code != 200:
                self.log_test("Regression push status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Regression push status", True)
            
            data = response.json()
            
            # Check ok:true
            if data.get("ok") == True:
                self.log_test("Regression push ok:true", True)
            else:
                self.log_test("Regression push ok:true", False, f"Expected ok:true, got {data.get('ok')}")
            
        except Exception as e:
            self.log_test("Regression push", False, f"Exception: {e}")

    async def test_regression_system_health(self):
        """Regression: Test GET /api/system/health still works"""
        print("\n🔍 Regression: Testing System Health endpoint...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/system/health")
            
            if response.status_code != 200:
                self.log_test("Regression system health status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Regression system health status", True)
            
            data = response.json()
            
            # Check expected fields
            if data.get("status") == "healthy":
                self.log_test("Regression system health status field", True)
            else:
                self.log_test("Regression system health status field", False, f"Expected 'healthy', got {data.get('status')}")
            
        except Exception as e:
            self.log_test("Regression system health", False, f"Exception: {e}")

    async def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Phase 8 Extension Registry Backend Tests")
        print("=" * 80)
        
        # Phase 8 new endpoint tests
        print("\n📋 PHASE 8 NEW FEATURES")
        print("-" * 40)
        await self.test_ext_register_with_client_id()
        await self.test_ext_register_idempotent()
        await self.test_ext_register_without_client_id()
        await self.test_ext_heartbeat()
        await self.test_ext_heartbeat_auto_register()
        await self.test_ext_clients()
        await self.test_ext_observation_push()
        await self.test_ext_observation_push_short_vin()
        await self.test_ext_observation_get()
        await self.test_ext_observation_get_unseen()
        await self.test_ext_degraded()
        await self.test_ext_health_new_fields()
        
        # Regression tests
        print("\n📋 REGRESSION TESTS")
        print("-" * 40)
        await self.test_regression_ext_health()
        await self.test_regression_ext_lookup()
        await self.test_regression_ext_auctionauto()
        await self.test_regression_ext_jobs()
        await self.test_regression_ext_push()
        await self.test_regression_system_health()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
            return 0
        else:
            print("❌ SOME TESTS FAILED")
            print("\nFailed tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['name']}: {result['details']}")
            return 1

async def main():
    """Main test runner"""
    tester = Phase8Tester()
    try:
        exit_code = await tester.run_all_tests()
        return exit_code
    finally:
        await tester.close()

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test runner error: {e}")
        sys.exit(1)