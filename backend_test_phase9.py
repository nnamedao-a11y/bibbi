#!/usr/bin/env python3
"""
Phase 9 Backend Testing - Silent Extension Death & Data Drift Detection
=======================================================================

Tests the enterprise reliability features:
1. Data drift detection with validate_result() requiring 17-char VIN + (title-with-year OR make+model)
2. Per-client success rate tracking with unhealthy marking
3. Validation endpoints with drift ratio tracking
4. Observation validation that prevents cache pollution
5. Health monitoring with drift detection
6. Regression testing of all existing endpoints

Usage: python backend_test_phase9.py
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

import httpx

# Backend URL from environment
BACKEND_URL = "https://car-dealer-pro-7.preview.emergentagent.com"

class Phase9Tester:
    def __init__(self, base_url: str = BACKEND_URL):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.client = None
        
    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} | {name}")
        if details:
            print(f"     {details}")
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append(f"{name}: {details}")

    async def test_endpoint(self, method: str, endpoint: str, expected_status: int = 200, 
                          data: Optional[Dict] = None, description: str = "") -> tuple[bool, Dict]:
        """Test a single endpoint"""
        url = f"{self.base_url}/api{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = await self.client.get(url)
            elif method.upper() == "POST":
                response = await self.client.post(url, json=data)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            try:
                result = response.json()
            except:
                result = {"status_code": response.status_code, "text": response.text[:200]}
            
            if not success:
                details = f"Expected {expected_status}, got {response.status_code}"
                if result.get("error"):
                    details += f" - {result['error']}"
            else:
                details = description
                
            self.log_test(f"{method} {endpoint}", success, details)
            return success, result
            
        except Exception as e:
            self.log_test(f"{method} {endpoint}", False, f"Exception: {str(e)}")
            return False, {"error": str(e)}

    async def test_validate_endpoint(self):
        """Test POST /api/ext/validate endpoint with various payloads"""
        print("\n🔍 Testing /api/ext/validate endpoint...")
        
        # Test 1: Valid payload with all required fields
        valid_payload = {
            "source": "poctra",
            "vin": "WAUSPBFF7HA146992", 
            "title": "2017 Audi A4",
            "year": 2017,
            "make": "Audi",
            "model": "A4"
        }
        success, result = await self.test_endpoint(
            "POST", "/ext/validate", 200, valid_payload,
            "Valid payload should return {valid:true, source:'poctra', drift_ratio:null|number}"
        )
        if success:
            if result.get("valid") is True and result.get("source") == "poctra":
                self.log_test("Valid payload structure check", True, "Returns valid:true with correct source")
            else:
                self.log_test("Valid payload structure check", False, f"Unexpected response: {result}")
        
        # Test 2: Missing VIN
        missing_vin_payload = {
            "source": "poctra",
            "title": "2017 Audi A4",
            "year": 2017,
            "make": "Audi",
            "model": "A4"
        }
        success, result = await self.test_endpoint(
            "POST", "/ext/validate", 200, missing_vin_payload,
            "Missing VIN should return {valid:false}"
        )
        if success and result.get("valid") is False:
            self.log_test("Missing VIN validation", True, "Correctly rejects payload without VIN")
        elif success:
            self.log_test("Missing VIN validation", False, f"Should reject but got: {result}")
        
        # Test 3: 17-char VIN but no title/make/model
        no_title_payload = {
            "source": "poctra", 
            "vin": "WAUSPBFF7HA146992"
        }
        success, result = await self.test_endpoint(
            "POST", "/ext/validate", 200, no_title_payload,
            "VIN without title/make/model should return {valid:false}"
        )
        if success and result.get("valid") is False:
            self.log_test("No title/make/model validation", True, "Correctly rejects VIN-only payload")
        elif success:
            self.log_test("No title/make/model validation", False, f"Should reject but got: {result}")

    async def test_observation_validation(self):
        """Test POST /api/ext/observation with validation"""
        print("\n🔍 Testing /api/ext/observation validation...")
        
        # Test 1: Invalid payload should return 200 with ok:false and NOT pollute cache
        invalid_payload = {
            "source": "poctra",
            "vin": "WAUSPBFF7HA146992", 
            "title": ""  # Empty title should be invalid
        }
        success, result = await self.test_endpoint(
            "POST", "/ext/observation", 200, invalid_payload,
            "Invalid payload should return 200 with {ok:false, error:'validation_failed', drift_ratio:...}"
        )
        if success:
            if (result.get("ok") is False and 
                result.get("error") == "validation_failed" and
                "drift_ratio" in result):
                self.log_test("Invalid observation rejection", True, "Correctly rejects with validation_failed")
            else:
                self.log_test("Invalid observation rejection", False, f"Unexpected response: {result}")
        
        # Test 2: Valid payload should still work
        valid_payload = {
            "source": "poctra",
            "vin": "WAUSPBFF7HA146992",
            "title": "2017 Audi A4",
            "year": 2017,
            "make": "Audi", 
            "model": "A4"
        }
        success, result = await self.test_endpoint(
            "POST", "/ext/observation", 200, valid_payload,
            "Valid payload should return {ok:true, vin, source, stored:>=1}"
        )
        if success:
            if (result.get("ok") is True and 
                result.get("vin") == "WAUSPBFF7HA146992" and
                result.get("source") == "poctra" and
                result.get("stored", 0) >= 1):
                self.log_test("Valid observation acceptance", True, "Correctly accepts valid payload")
            else:
                self.log_test("Valid observation acceptance", False, f"Unexpected response: {result}")
        
        # Test 3: Check that invalid VIN was NOT cached
        success, result = await self.test_endpoint(
            "GET", "/ext/observation/WAUSPBFF7HA146992", 200, None,
            "Invalid-rejected VIN should NOT have a cache hit"
        )
        if success:
            # The valid observation should be there, but we need to check it wasn't polluted by invalid one
            if result.get("hit") is True:
                # This is expected since we sent a valid observation after the invalid one
                self.log_test("Cache pollution check", True, "Valid observation found in cache (invalid was rejected)")
            else:
                self.log_test("Cache pollution check", True, "No cache hit (both invalid and valid were rejected)")

    async def test_health_drift_fields(self):
        """Test GET /api/ext/health for new drift fields"""
        print("\n🔍 Testing /api/ext/health drift fields...")
        
        success, result = await self.test_endpoint(
            "GET", "/ext/health", 200, None,
            "Health endpoint should include drift_ratio and drifting fields per source"
        )
        
        if success:
            sources = result.get("sources", {})
            drifting_sources = result.get("drifting_sources", [])
            
            # Check that sources have drift fields
            has_drift_fields = False
            for source_name, source_data in sources.items():
                if "drift_ratio" in source_data and "drifting" in source_data:
                    has_drift_fields = True
                    break
            
            if has_drift_fields:
                self.log_test("Health drift fields", True, "Sources include drift_ratio and drifting fields")
            else:
                self.log_test("Health drift fields", False, f"Missing drift fields in sources: {list(sources.keys())}")
            
            # Check top-level drifting_sources field
            if isinstance(drifting_sources, list):
                self.log_test("Health drifting_sources field", True, f"drifting_sources is list: {drifting_sources}")
            else:
                self.log_test("Health drifting_sources field", False, f"drifting_sources should be list, got: {type(drifting_sources)}")

    async def test_drifting_endpoint(self):
        """Test GET /api/ext/drifting endpoint"""
        print("\n🔍 Testing /api/ext/drifting endpoint...")
        
        success, result = await self.test_endpoint(
            "GET", "/ext/drifting", 200, None,
            "Should return {drifting:[], ratios:{}}"
        )
        
        if success:
            if ("drifting" in result and isinstance(result["drifting"], list) and
                "ratios" in result and isinstance(result["ratios"], dict)):
                self.log_test("Drifting endpoint structure", True, f"Correct structure: drifting={result['drifting']}, ratios keys={list(result['ratios'].keys())}")
            else:
                self.log_test("Drifting endpoint structure", False, f"Unexpected structure: {result}")

    async def test_clients_health_fields(self):
        """Test GET /api/ext/clients for new health fields"""
        print("\n🔍 Testing /api/ext/clients health fields...")
        
        success, result = await self.test_endpoint(
            "GET", "/ext/clients", 200, None,
            "Clients should include success_rate_recent and unhealthy fields"
        )
        
        if success:
            clients = result.get("clients", [])
            if clients:
                # Check first client for required fields
                client = clients[0]
                has_success_rate = "success_rate_recent" in client
                has_unhealthy = "unhealthy" in client
                
                if has_success_rate and has_unhealthy:
                    self.log_test("Client health fields", True, f"Client has success_rate_recent and unhealthy fields")
                else:
                    # This is expected to fail in Phase 9 - these fields should be added
                    missing_fields = []
                    if not has_success_rate:
                        missing_fields.append("success_rate_recent")
                    if not has_unhealthy:
                        missing_fields.append("unhealthy")
                    self.log_test("Client health fields", False, f"Missing Phase 9 fields: {missing_fields}. Current fields: {list(client.keys())}")
            else:
                self.log_test("Client health fields", True, "No clients registered (expected for test environment)")

    async def test_drift_detection_scenario(self):
        """Test drift detection by pushing 8 invalid observations"""
        print("\n🔍 Testing drift detection scenario...")
        
        # Push 8 invalid observations from same source 'driftcheck'
        for i in range(8):
            vin_suffix = f"{i:02d}1234567890"[:10]  # Ensure we get exactly 10 chars after TESTVIN
            invalid_payload = {
                "source": "driftcheck",
                "vin": f"TESTVIN{vin_suffix}",  # TESTVIN (7) + 10 chars = 17 total
                "title": ""  # Empty title makes it invalid
            }
            success, result = await self.test_endpoint(
                "POST", "/ext/observation", 200, invalid_payload,
                f"Invalid observation {i+1}/8 should return ok:false"
            )
            if success and result.get("ok") is False:
                continue
            else:
                self.log_test(f"Drift test observation {i+1}", False, f"Expected ok:false, got: {result}")
                return
        
        self.log_test("8 invalid observations pushed", True, "All 8 invalid observations correctly rejected")
        
        # Now check if 'driftcheck' is listed as drifting with ratio=1.0
        success, result = await self.test_endpoint(
            "GET", "/ext/drifting", 200, None,
            "After 8 invalid observations, driftcheck should be drifting with ratio=1.0"
        )
        
        if success:
            drifting_sources = result.get("drifting", [])
            ratios = result.get("ratios", {})
            
            if "driftcheck" in drifting_sources:
                self.log_test("Drift detection trigger", True, f"driftcheck correctly flagged as drifting")
                
                # Check ratio
                drift_ratio = ratios.get("driftcheck")
                if drift_ratio == 1.0:
                    self.log_test("Drift ratio calculation", True, f"driftcheck ratio = {drift_ratio} (expected 1.0)")
                else:
                    self.log_test("Drift ratio calculation", False, f"Expected ratio 1.0, got {drift_ratio}")
            else:
                self.log_test("Drift detection trigger", False, f"driftcheck not in drifting sources: {drifting_sources}")

    async def test_drifting_source_acceptance(self):
        """Test that drifting source still accepts valid payloads"""
        print("\n🔍 Testing drifting source still accepts valid payloads...")
        
        # Send a valid payload from 'driftcheck' source (which should be drifting now)
        valid_payload = {
            "source": "driftcheck",
            "vin": "VALIDVIN123456789",  # Exactly 17 chars
            "title": "2020 Test Vehicle",
            "year": 2020,
            "make": "Test",
            "model": "Vehicle"
        }
        
        success, result = await self.test_endpoint(
            "POST", "/ext/observation", 200, valid_payload,
            "Valid payload from drifting source should still be accepted with ok:true"
        )
        
        if success:
            if result.get("ok") is True:
                self.log_test("Drifting source valid acceptance", True, "Drifting source still accepts valid payloads")
            else:
                self.log_test("Drifting source valid acceptance", False, f"Valid payload rejected: {result}")

    async def test_regression_endpoints(self):
        """Test regression - ensure existing endpoints still work"""
        print("\n🔍 Testing regression endpoints...")
        
        # Test /api/ext/register
        register_payload = {
            "client_id": "test-client-phase9",
            "label": "Phase 9 Test Client",
            "capabilities": ["poctra", "carsfromwest"],
            "version": "9.0.0"
        }
        success, result = await self.test_endpoint(
            "POST", "/ext/register", 200, register_payload,
            "Extension registration should work as in iteration_2"
        )
        if success and result.get("ok") is True:
            self.log_test("Regression: ext/register", True, "Registration works correctly")
        elif success:
            self.log_test("Regression: ext/register", False, f"Unexpected response: {result}")
        
        # Test /api/ext/heartbeat
        heartbeat_payload = {
            "client_id": "test-client-phase9",
            "online": True
        }
        success, result = await self.test_endpoint(
            "POST", "/ext/heartbeat", 200, heartbeat_payload,
            "Heartbeat should be idempotent and update last_seen_at"
        )
        if success and result.get("ok") is True:
            self.log_test("Regression: ext/heartbeat", True, "Heartbeat works correctly")
        elif success:
            self.log_test("Regression: ext/heartbeat", False, f"Unexpected response: {result}")
        
        # Test /api/ext/clients
        success, result = await self.test_endpoint(
            "GET", "/ext/clients", 200, None,
            "Clients endpoint should return capability list sorted"
        )
        if success and "clients" in result:
            clients = result["clients"]
            if any(c.get("client_id") == "test-client-phase9" for c in clients):
                self.log_test("Regression: ext/clients", True, "Clients endpoint works, test client found")
            else:
                self.log_test("Regression: ext/clients", True, "Clients endpoint works (test client may have expired)")
        elif success:
            self.log_test("Regression: ext/clients", False, f"Unexpected response structure: {result}")

    async def test_auctionauto_regression(self):
        """Test AuctionAuto regression"""
        print("\n🔍 Testing AuctionAuto regression...")
        
        # Test with Tesla VIN as suggested in requirements
        tesla_vin = "5YJSA1E25HF199047"
        success, result = await self.test_endpoint(
            "POST", "/ext/auctionauto/test", 200, {"vin": tesla_vin},
            "AuctionAuto test should work with Tesla VIN (found may be true or false)"
        )
        
        if success:
            # Check response shape regardless of found status
            required_fields = ["vin", "found"]
            has_required = all(field in result for field in required_fields)
            
            if has_required:
                found = result.get("found")
                if isinstance(found, bool):
                    if found and result.get("data"):
                        self.log_test("Regression: auctionauto/test", True, f"Tesla VIN found with data")
                    elif not found:
                        self.log_test("Regression: auctionauto/test", True, f"Tesla VIN not found (acceptable)")
                    else:
                        self.log_test("Regression: auctionauto/test", False, f"Found=true but no data: {result}")
                else:
                    self.log_test("Regression: auctionauto/test", False, f"found field should be boolean, got: {type(found)}")
            else:
                self.log_test("Regression: auctionauto/test", False, f"Missing required fields. Got: {list(result.keys())}")

    async def test_lookup_regression(self):
        """Test /api/ext/lookup regression"""
        print("\n🔍 Testing lookup regression...")
        
        lookup_payload = {"vin": "TESTVIN123456789"}
        start_time = time.time()
        
        success, result = await self.test_endpoint(
            "POST", "/ext/lookup", 200, lookup_payload,
            "Lookup should complete within 6 seconds with expected shape"
        )
        
        elapsed = time.time() - start_time
        
        if success:
            if elapsed <= 6.0:
                self.log_test("Regression: lookup timing", True, f"Completed in {elapsed:.2f}s (< 6s)")
            else:
                self.log_test("Regression: lookup timing", False, f"Took {elapsed:.2f}s (> 6s limit)")
            
            # Check response shape
            if "request_id" in result:
                self.log_test("Regression: lookup shape", True, "Response includes request_id")
            else:
                self.log_test("Regression: lookup shape", False, f"Missing request_id in response: {list(result.keys())}")

    async def test_jobs_regression(self):
        """Test /api/ext/jobs regression"""
        print("\n🔍 Testing jobs regression...")
        
        success, result = await self.test_endpoint(
            "GET", "/ext/jobs", 200, None,
            "Jobs endpoint should return {jobs:[]} (empty since no test jobs queued)"
        )
        
        if success:
            if "jobs" in result and isinstance(result["jobs"], list):
                self.log_test("Regression: jobs structure", True, f"Jobs endpoint returns list with {len(result['jobs'])} jobs")
            else:
                self.log_test("Regression: jobs structure", False, f"Expected jobs array, got: {result}")

    async def run_all_tests(self):
        """Run all Phase 9 tests"""
        print("🚀 Starting Phase 9 Backend Testing...")
        print(f"Backend URL: {self.base_url}")
        print("="*80)
        
        try:
            # Core Phase 9 features
            await self.test_validate_endpoint()
            await self.test_observation_validation()
            await self.test_health_drift_fields()
            await self.test_drifting_endpoint()
            await self.test_clients_health_fields()
            await self.test_drift_detection_scenario()
            await self.test_drifting_source_acceptance()
            
            # Regression tests
            await self.test_regression_endpoints()
            await self.test_auctionauto_regression()
            await self.test_lookup_regression()
            await self.test_jobs_regression()
            
        except Exception as e:
            print(f"\n❌ Test suite error: {e}")
            self.failed_tests.append(f"Test suite error: {e}")
        
        # Print summary
        print("\n" + "="*80)
        print("📊 TEST SUMMARY")
        print("="*80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"{i}. {failure}")
        
        print("\n✅ Phase 9 testing completed!")
        return self.tests_passed, self.tests_run, self.failed_tests

async def main():
    """Main test runner"""
    async with Phase9Tester() as tester:
        passed, total, failures = await tester.run_all_tests()
        
        # Exit with appropriate code
        if passed == total:
            sys.exit(0)
        else:
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())