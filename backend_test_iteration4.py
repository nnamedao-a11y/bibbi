#!/usr/bin/env python3
"""
Phase 9 Follow-up Backend Testing - Iteration 4
===============================================

Tests the two specific fixes from the main agent:
1. GET /api/ext/clients - must include 'success_rate_recent' and 'unhealthy' fields, 
   and must NOT leak internal fields like 'jobs_received_at' / 'successes_at'
2. POST /api/ext/lookup - robust handling of empty body, no body, and invalid VIN lengths

Plus regression testing for all previous phases.

Usage: python backend_test_iteration4.py
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

class Iteration4Tester:
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
                          data: Optional[Dict] = None, description: str = "",
                          headers: Optional[Dict] = None, raw_body: Optional[str] = None) -> tuple[bool, Dict]:
        """Test a single endpoint with optional raw body support"""
        url = f"{self.base_url}/api{endpoint}"
        
        try:
            request_headers = {"Content-Type": "application/json"}
            if headers:
                request_headers.update(headers)
            
            if method.upper() == "GET":
                response = await self.client.get(url, headers=request_headers)
            elif method.upper() == "POST":
                if raw_body is not None:
                    # Send raw body (for testing empty body scenarios)
                    response = await self.client.post(url, content=raw_body, headers=request_headers)
                else:
                    response = await self.client.post(url, json=data, headers=request_headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            try:
                result = response.json()
            except:
                result = {"status_code": response.status_code, "text": response.text[:200]}
            
            if not success:
                details = f"Expected {expected_status}, got {response.status_code}"
                if result.get("error") or result.get("detail"):
                    details += f" - {result.get('error') or result.get('detail')}"
            else:
                details = description
                
            self.log_test(f"{method} {endpoint}", success, details)
            return success, result
            
        except Exception as e:
            self.log_test(f"{method} {endpoint}", False, f"Exception: {str(e)}")
            return False, {"error": str(e)}

    async def test_clients_health_fields_fixed(self):
        """Test GET /api/ext/clients for the fixed health fields"""
        print("\n🔍 Testing GET /api/ext/clients - Fixed health fields...")
        
        # First register a fresh client to test with
        register_payload = {
            "client_id": "fresh-test-client-iter4",
            "label": "Fresh Test Client Iteration 4",
            "capabilities": ["poctra", "carsfromwest"],
            "version": "4.0.0"
        }
        
        success, result = await self.test_endpoint(
            "POST", "/ext/register", 200, register_payload,
            "Register fresh client for testing"
        )
        
        if not success:
            self.log_test("Fresh client registration", False, "Cannot test without a client")
            return
        
        # Now test the clients endpoint
        success, result = await self.test_endpoint(
            "GET", "/ext/clients", 200, None,
            "Clients should include success_rate_recent and unhealthy fields"
        )
        
        if not success:
            return
        
        clients = result.get("clients", [])
        if not clients:
            self.log_test("Clients endpoint - no clients", False, "No clients found to test")
            return
        
        # Find our fresh client
        fresh_client = None
        for client in clients:
            if client.get("client_id") == "fresh-test-client-iter4":
                fresh_client = client
                break
        
        if not fresh_client:
            self.log_test("Fresh client not found", False, "Registered client not found in clients list")
            return
        
        # Test 1: Must include success_rate_recent and unhealthy fields
        has_success_rate = "success_rate_recent" in fresh_client
        has_unhealthy = "unhealthy" in fresh_client
        
        if has_success_rate and has_unhealthy:
            self.log_test("Required health fields present", True, "success_rate_recent and unhealthy fields found")
        else:
            missing_fields = []
            if not has_success_rate:
                missing_fields.append("success_rate_recent")
            if not has_unhealthy:
                missing_fields.append("unhealthy")
            self.log_test("Required health fields present", False, f"Missing fields: {missing_fields}")
        
        # Test 2: Fresh client should have success_rate_recent:null and unhealthy:false
        success_rate = fresh_client.get("success_rate_recent")
        unhealthy = fresh_client.get("unhealthy")
        
        if success_rate is None and unhealthy is False:
            self.log_test("Fresh client values", True, "success_rate_recent:null and unhealthy:false as expected")
        else:
            self.log_test("Fresh client values", False, f"Expected success_rate_recent:null, unhealthy:false, got {success_rate}, {unhealthy}")
        
        # Test 3: Must NOT leak internal fields
        internal_fields = ["jobs_received_at", "successes_at"]
        leaked_fields = [field for field in internal_fields if field in fresh_client]
        
        if not leaked_fields:
            self.log_test("Internal fields not leaked", True, "No internal _at deques found in public payload")
        else:
            self.log_test("Internal fields not leaked", False, f"Internal fields leaked: {leaked_fields}")
        
        # Log all fields for debugging
        print(f"     Fresh client fields: {list(fresh_client.keys())}")

    async def test_lookup_empty_body_scenarios(self):
        """Test POST /api/ext/lookup with various empty body scenarios"""
        print("\n🔍 Testing POST /api/ext/lookup - Empty body scenarios...")
        
        # Test 1: Valid VIN (17 chars) should return 200
        valid_payload = {"vin": "WAUSPBFF7HA146992"}
        success, result = await self.test_endpoint(
            "POST", "/ext/lookup", 200, valid_payload,
            "Valid 17-char VIN should return 200 with request_id, vin, sources_replied:[], results:[]"
        )
        
        if success:
            required_fields = ["request_id", "vin", "sources_replied", "results"]
            has_all_fields = all(field in result for field in required_fields)
            
            if has_all_fields:
                self.log_test("Valid VIN response structure", True, f"All required fields present: {required_fields}")
            else:
                missing = [f for f in required_fields if f not in result]
                self.log_test("Valid VIN response structure", False, f"Missing fields: {missing}")
        
        # Test 2: Empty body should return 400 with specific error message
        success, result = await self.test_endpoint(
            "POST", "/ext/lookup", 400, None, 
            "Empty body should return 400 with 'vin (17-char) required'",
            raw_body=""
        )
        
        if success:
            detail = result.get("detail", "")
            if "vin (17-char) required" in detail:
                self.log_test("Empty body error message", True, f"Correct error: {detail}")
            else:
                self.log_test("Empty body error message", False, f"Wrong error message: {detail}")
        
        # Test 3: No body at all (Content-Type unset, empty body) should return 400
        success, result = await self.test_endpoint(
            "POST", "/ext/lookup", 400, None,
            "No body with unset Content-Type should return 400",
            headers={}, raw_body=""
        )
        
        if success:
            detail = result.get("detail", "")
            if "vin (17-char) required" in detail:
                self.log_test("No body error message", True, f"Correct error: {detail}")
            else:
                self.log_test("No body error message", False, f"Wrong error message: {detail}")
        
        # Test 4: VIN < 17 chars should return 400
        short_vin_payload = {"vin": "SHORT"}
        success, result = await self.test_endpoint(
            "POST", "/ext/lookup", 400, short_vin_payload,
            "VIN < 17 chars should return 400 with 'vin (17-char) required'"
        )
        
        if success:
            detail = result.get("detail", "")
            if "vin (17-char) required" in detail:
                self.log_test("Short VIN error message", True, f"Correct error: {detail}")
            else:
                self.log_test("Short VIN error message", False, f"Wrong error message: {detail}")
        
        # Test 5: VIN > 17 chars should return 400
        long_vin_payload = {"vin": "WAUSPBFF7HA146992EXTRA"}
        success, result = await self.test_endpoint(
            "POST", "/ext/lookup", 400, long_vin_payload,
            "VIN > 17 chars should return 400"
        )
        
        if success:
            detail = result.get("detail", "")
            self.log_test("Long VIN rejection", True, f"Long VIN rejected: {detail}")

    async def test_regression_phase9_endpoints(self):
        """Test regression for Phase 9.1/9.2 endpoints"""
        print("\n🔍 Testing Phase 9.1/9.2 regression...")
        
        # Test /api/ext/validate (3 cases)
        # Case 1: Valid payload
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
            "Valid payload should return {valid:true}"
        )
        if success and result.get("valid") is True:
            self.log_test("Validate - valid case", True, "Valid payload correctly accepted")
        elif success:
            self.log_test("Validate - valid case", False, f"Expected valid:true, got: {result}")
        
        # Case 2: No VIN
        no_vin_payload = {"source": "poctra", "title": "2017 Audi A4"}
        success, result = await self.test_endpoint(
            "POST", "/ext/validate", 200, no_vin_payload,
            "No VIN should return {valid:false}"
        )
        if success and result.get("valid") is False:
            self.log_test("Validate - no VIN case", True, "No VIN correctly rejected")
        elif success:
            self.log_test("Validate - no VIN case", False, f"Expected valid:false, got: {result}")
        
        # Case 3: VIN-only no title
        vin_only_payload = {"source": "poctra", "vin": "WAUSPBFF7HA146992"}
        success, result = await self.test_endpoint(
            "POST", "/ext/validate", 200, vin_only_payload,
            "VIN-only should return {valid:false}"
        )
        if success and result.get("valid") is False:
            self.log_test("Validate - VIN-only case", True, "VIN-only correctly rejected")
        elif success:
            self.log_test("Validate - VIN-only case", False, f"Expected valid:false, got: {result}")
        
        # Test /api/ext/observation - rejects invalid + accepts valid
        invalid_obs = {"source": "test", "vin": "WAUSPBFF7HA146992", "title": ""}
        success, result = await self.test_endpoint(
            "POST", "/ext/observation", 200, invalid_obs,
            "Invalid observation should be rejected"
        )
        if success and result.get("ok") is False:
            self.log_test("Observation - invalid rejection", True, "Invalid observation correctly rejected")
        elif success:
            self.log_test("Observation - invalid rejection", False, f"Expected ok:false, got: {result}")
        
        valid_obs = {
            "source": "test", 
            "vin": "WAUSPBFF7HA146992", 
            "title": "2017 Audi A4",
            "year": 2017
        }
        success, result = await self.test_endpoint(
            "POST", "/ext/observation", 200, valid_obs,
            "Valid observation should be accepted"
        )
        if success and result.get("ok") is True:
            self.log_test("Observation - valid acceptance", True, "Valid observation correctly accepted")
        elif success:
            self.log_test("Observation - valid acceptance", False, f"Expected ok:true, got: {result}")
        
        # Test /api/ext/drifting structure
        success, result = await self.test_endpoint(
            "GET", "/ext/drifting", 200, None,
            "Drifting endpoint should return {drifting:[], ratios:{}}"
        )
        if success:
            if ("drifting" in result and "ratios" in result and 
                isinstance(result["drifting"], list) and isinstance(result["ratios"], dict)):
                self.log_test("Drifting structure", True, "Correct structure returned")
            else:
                self.log_test("Drifting structure", False, f"Wrong structure: {result}")
        
        # Test /api/ext/health drift_ratio + drifting_sources fields
        success, result = await self.test_endpoint(
            "GET", "/ext/health", 200, None,
            "Health should include drift_ratio and drifting_sources"
        )
        if success:
            has_drifting_sources = "drifting_sources" in result
            sources = result.get("sources", {})
            has_drift_fields = any("drift_ratio" in src for src in sources.values())
            
            if has_drifting_sources and has_drift_fields:
                self.log_test("Health drift fields", True, "drift_ratio and drifting_sources present")
            else:
                self.log_test("Health drift fields", False, f"Missing drift fields. drifting_sources: {has_drifting_sources}, drift_ratio in sources: {has_drift_fields}")

    async def test_regression_phase8_endpoints(self):
        """Test regression for Phase 8 endpoints"""
        print("\n🔍 Testing Phase 8 regression...")
        
        # Test register/heartbeat/clients/observation/observation/{vin}/degraded
        
        # Register
        register_payload = {
            "client_id": "phase8-test-client",
            "label": "Phase 8 Test",
            "capabilities": ["poctra"],
            "version": "8.0.0"
        }
        success, result = await self.test_endpoint(
            "POST", "/ext/register", 200, register_payload,
            "Client registration should work"
        )
        if success and result.get("ok") is True:
            self.log_test("Phase 8 - register", True, "Registration works")
        elif success:
            self.log_test("Phase 8 - register", False, f"Registration failed: {result}")
        
        # Heartbeat
        heartbeat_payload = {"client_id": "phase8-test-client", "online": True}
        success, result = await self.test_endpoint(
            "POST", "/ext/heartbeat", 200, heartbeat_payload,
            "Heartbeat should work"
        )
        if success and result.get("ok") is True:
            self.log_test("Phase 8 - heartbeat", True, "Heartbeat works")
        elif success:
            self.log_test("Phase 8 - heartbeat", False, f"Heartbeat failed: {result}")
        
        # Clients
        success, result = await self.test_endpoint(
            "GET", "/ext/clients", 200, None,
            "Clients endpoint should work"
        )
        if success and "clients" in result:
            self.log_test("Phase 8 - clients", True, f"Clients endpoint works, {len(result['clients'])} clients")
        elif success:
            self.log_test("Phase 8 - clients", False, f"Clients endpoint wrong format: {result}")
        
        # Observation
        obs_payload = {
            "source": "phase8test",
            "vin": "PHASE8TEST1234567",
            "title": "Phase 8 Test Vehicle",
            "year": 2020
        }
        success, result = await self.test_endpoint(
            "POST", "/ext/observation", 200, obs_payload,
            "Observation should work"
        )
        if success and result.get("ok") is True:
            self.log_test("Phase 8 - observation", True, "Observation works")
        elif success:
            self.log_test("Phase 8 - observation", False, f"Observation failed: {result}")
        
        # Observation lookup
        success, result = await self.test_endpoint(
            "GET", "/ext/observation/PHASE8TEST1234567", 200, None,
            "Observation lookup should work"
        )
        if success:
            self.log_test("Phase 8 - observation lookup", True, f"Observation lookup works, hit: {result.get('hit')}")
        
        # Degraded sources
        success, result = await self.test_endpoint(
            "GET", "/ext/degraded", 200, None,
            "Degraded sources endpoint should work"
        )
        if success and "degraded" in result:
            self.log_test("Phase 8 - degraded", True, f"Degraded endpoint works, {len(result['degraded'])} degraded sources")
        elif success:
            self.log_test("Phase 8 - degraded", False, f"Degraded endpoint wrong format: {result}")

    async def run_all_tests(self):
        """Run all iteration 4 tests"""
        print("🚀 Starting Iteration 4 Backend Testing...")
        print(f"Backend URL: {self.base_url}")
        print("="*80)
        
        try:
            # Primary fixes to test
            await self.test_clients_health_fields_fixed()
            await self.test_lookup_empty_body_scenarios()
            
            # Regression tests
            await self.test_regression_phase9_endpoints()
            await self.test_regression_phase8_endpoints()
            
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
        
        print("\n✅ Iteration 4 testing completed!")
        return self.tests_passed, self.tests_run, self.failed_tests

async def main():
    """Main test runner"""
    async with Iteration4Tester() as tester:
        passed, total, failures = await tester.run_all_tests()
        
        # Exit with appropriate code
        if passed == total:
            sys.exit(0)
        else:
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())