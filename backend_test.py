#!/usr/bin/env python3
"""
Backend API Testing for Multi-Source Resolver (Phase V)
========================================================

Tests all /api/ext/* endpoints and multi-source resolver functionality
including AuctionAuto scraper, extension layer, and health monitoring.

Test VINs:
- 2C3CDZFJ0MH580278 (real, found on auctionauto)
- 5YJSA1E25HF199047 (real Tesla, found on auctionauto)  
- 1HGCM82633A123456 (synthetic, must miss)
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

# Configuration
BASE_URL = "https://car-dealer-pro-7.preview.emergentagent.com"
TIMEOUT = 30.0

# Test VINs as specified
REAL_VIN_1 = "2C3CDZFJ0MH580278"  # Real VIN, should be found on auctionauto
REAL_VIN_2 = "5YJSA1E25HF199047"  # Real Tesla, should be found on auctionauto
SYNTHETIC_VIN = "1HGCM82633A123456"  # Synthetic, should miss
INVALID_VIN = "INVALID123"  # Invalid VIN length

class MultiSourceTester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip('/')
        self.client = httpx.AsyncClient(timeout=TIMEOUT)
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

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

    async def test_health_endpoint(self):
        """Test GET /api/ext/health returns proper structure"""
        print("\n🔍 Testing Health Endpoint...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/ext/health")
            
            if response.status_code != 200:
                self.log_test("Health endpoint status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Health endpoint status", True)
            
            try:
                data = response.json()
            except Exception as e:
                self.log_test("Health endpoint JSON", False, f"Invalid JSON: {e}")
                return
            
            self.log_test("Health endpoint JSON", True)
            
            # Check required fields
            required_fields = ["sources", "queue_depth", "results_in_flight", "timestamp"]
            for field in required_fields:
                if field not in data:
                    self.log_test(f"Health field '{field}'", False, "Missing required field")
                    return
            
            self.log_test("Health required fields", True)
            
            # Check sources structure
            sources = data.get("sources", {})
            required_sources = ["auctionauto", "poctra", "carsfromwest", "autoauctionhistory", "salvagebid"]
            
            for source in required_sources:
                if source not in sources:
                    self.log_test(f"Health source '{source}'", False, "Missing source")
                    continue
                
                source_data = sources[source]
                required_source_fields = ["calls", "hits", "errors", "latency_p50_ms", "latency_p95_ms", "hit_ratio", "sample_size"]
                
                missing_fields = [f for f in required_source_fields if f not in source_data]
                if missing_fields:
                    self.log_test(f"Health source '{source}' fields", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test(f"Health source '{source}' fields", True)
            
            print(f"📊 Health data: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test("Health endpoint", False, f"Exception: {e}")

    async def test_auctionauto_real_vin_1(self):
        """Test POST /api/ext/auctionauto/test with real VIN 2C3CDZFJ0MH580278"""
        print(f"\n🔍 Testing AuctionAuto with real VIN: {REAL_VIN_1}...")
        
        try:
            payload = {"vin": REAL_VIN_1}
            response = await self.client.post(
                f"{self.base_url}/api/ext/auctionauto/test",
                json=payload
            )
            
            if response.status_code != 200:
                self.log_test(f"AuctionAuto {REAL_VIN_1} status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test(f"AuctionAuto {REAL_VIN_1} status", True)
            
            try:
                data = response.json()
            except Exception as e:
                self.log_test(f"AuctionAuto {REAL_VIN_1} JSON", False, f"Invalid JSON: {e}")
                return
            
            self.log_test(f"AuctionAuto {REAL_VIN_1} JSON", True)
            
            # Check found=true
            if not data.get("found"):
                self.log_test(f"AuctionAuto {REAL_VIN_1} found", False, "Expected found:true")
                return
            
            self.log_test(f"AuctionAuto {REAL_VIN_1} found", True)
            
            # Check data structure
            car_data = data.get("data", {})
            if car_data.get("source") != "AUCTIONAUTO":
                self.log_test(f"AuctionAuto {REAL_VIN_1} source", False, f"Expected AUCTIONAUTO, got {car_data.get('source')}")
            else:
                self.log_test(f"AuctionAuto {REAL_VIN_1} source", True)
            
            if car_data.get("vin") != REAL_VIN_1:
                self.log_test(f"AuctionAuto {REAL_VIN_1} VIN", False, f"VIN mismatch")
            else:
                self.log_test(f"AuctionAuto {REAL_VIN_1} VIN", True)
            
            # Check required fields
            required_fields = ["lot", "title", "year", "make", "model", "images", "image_count"]
            for field in required_fields:
                if field in car_data and car_data[field]:
                    self.log_test(f"AuctionAuto {REAL_VIN_1} {field}", True)
                else:
                    self.log_test(f"AuctionAuto {REAL_VIN_1} {field}", False, f"Missing or empty {field}")
            
            # Check image count >= 1
            image_count = car_data.get("image_count", 0)
            if image_count >= 1:
                self.log_test(f"AuctionAuto {REAL_VIN_1} image_count>=1", True)
            else:
                self.log_test(f"AuctionAuto {REAL_VIN_1} image_count>=1", False, f"Got {image_count}")
            
            print(f"📊 AuctionAuto data: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test(f"AuctionAuto {REAL_VIN_1}", False, f"Exception: {e}")

    async def test_auctionauto_real_vin_2(self):
        """Test POST /api/ext/auctionauto/test with real Tesla VIN 5YJSA1E25HF199047"""
        print(f"\n🔍 Testing AuctionAuto with Tesla VIN: {REAL_VIN_2}...")
        
        try:
            payload = {"vin": REAL_VIN_2}
            response = await self.client.post(
                f"{self.base_url}/api/ext/auctionauto/test",
                json=payload
            )
            
            if response.status_code != 200:
                self.log_test(f"AuctionAuto {REAL_VIN_2} status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test(f"AuctionAuto {REAL_VIN_2} status", True)
            
            try:
                data = response.json()
            except Exception as e:
                self.log_test(f"AuctionAuto {REAL_VIN_2} JSON", False, f"Invalid JSON: {e}")
                return
            
            self.log_test(f"AuctionAuto {REAL_VIN_2} JSON", True)
            
            # Check found=true
            if not data.get("found"):
                self.log_test(f"AuctionAuto {REAL_VIN_2} found", False, "Expected found:true")
                return
            
            self.log_test(f"AuctionAuto {REAL_VIN_2} found", True)
            
            # Check title contains TESLA and MODEL S
            car_data = data.get("data", {})
            title = (car_data.get("title") or "").upper()
            
            if "TESLA" in title:
                self.log_test(f"AuctionAuto {REAL_VIN_2} title contains TESLA", True)
            else:
                self.log_test(f"AuctionAuto {REAL_VIN_2} title contains TESLA", False, f"Title: {title}")
            
            if "MODEL S" in title:
                self.log_test(f"AuctionAuto {REAL_VIN_2} title contains MODEL S", True)
            else:
                self.log_test(f"AuctionAuto {REAL_VIN_2} title contains MODEL S", False, f"Title: {title}")
            
            print(f"📊 Tesla data: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test(f"AuctionAuto {REAL_VIN_2}", False, f"Exception: {e}")

    async def test_auctionauto_synthetic_vin(self):
        """Test POST /api/ext/auctionauto/test with synthetic VIN (should return found:false)"""
        print(f"\n🔍 Testing AuctionAuto with synthetic VIN: {SYNTHETIC_VIN}...")
        
        try:
            payload = {"vin": SYNTHETIC_VIN}
            response = await self.client.post(
                f"{self.base_url}/api/ext/auctionauto/test",
                json=payload
            )
            
            if response.status_code != 200:
                self.log_test(f"AuctionAuto {SYNTHETIC_VIN} status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test(f"AuctionAuto {SYNTHETIC_VIN} status", True)
            
            try:
                data = response.json()
            except Exception as e:
                self.log_test(f"AuctionAuto {SYNTHETIC_VIN} JSON", False, f"Invalid JSON: {e}")
                return
            
            self.log_test(f"AuctionAuto {SYNTHETIC_VIN} JSON", True)
            
            # Check found=false (false-positive guard)
            if data.get("found") == False:
                self.log_test(f"AuctionAuto {SYNTHETIC_VIN} found:false", True)
            else:
                self.log_test(f"AuctionAuto {SYNTHETIC_VIN} found:false", False, f"Expected found:false, got {data.get('found')}")
            
            print(f"📊 Synthetic VIN data: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test(f"AuctionAuto {SYNTHETIC_VIN}", False, f"Exception: {e}")

    async def test_auctionauto_invalid_vin(self):
        """Test POST /api/ext/auctionauto/test with invalid VIN length (should return 400)"""
        print(f"\n🔍 Testing AuctionAuto with invalid VIN: {INVALID_VIN}...")
        
        try:
            payload = {"vin": INVALID_VIN}
            response = await self.client.post(
                f"{self.base_url}/api/ext/auctionauto/test",
                json=payload
            )
            
            if response.status_code == 400:
                self.log_test(f"AuctionAuto {INVALID_VIN} 400 status", True)
            else:
                self.log_test(f"AuctionAuto {INVALID_VIN} 400 status", False, f"Expected 400, got {response.status_code}")
            
            print(f"📊 Invalid VIN response: {response.status_code}")
            
        except Exception as e:
            self.log_test(f"AuctionAuto {INVALID_VIN}", False, f"Exception: {e}")

    async def test_ext_lookup(self):
        """Test POST /api/ext/lookup (should return within 6 seconds with request_id)"""
        print(f"\n🔍 Testing Extension Lookup with VIN: {REAL_VIN_1}...")
        
        try:
            payload = {"vin": REAL_VIN_1}
            start_time = time.time()
            
            response = await self.client.post(
                f"{self.base_url}/api/ext/lookup",
                json=payload
            )
            
            elapsed = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("Extension lookup status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension lookup status", True)
            
            # Check response time <= 6 seconds
            if elapsed <= 6.0:
                self.log_test("Extension lookup timing", True, f"Completed in {elapsed:.2f}s")
            else:
                self.log_test("Extension lookup timing", False, f"Took {elapsed:.2f}s, expected ≤6s")
            
            try:
                data = response.json()
            except Exception as e:
                self.log_test("Extension lookup JSON", False, f"Invalid JSON: {e}")
                return
            
            self.log_test("Extension lookup JSON", True)
            
            # Check required fields
            if "request_id" not in data:
                self.log_test("Extension lookup request_id", False, "Missing request_id")
            else:
                self.log_test("Extension lookup request_id", True)
            
            # Check sources_replied is empty (no extension running)
            sources_replied = data.get("sources_replied", [])
            if sources_replied == []:
                self.log_test("Extension lookup sources_replied empty", True)
            else:
                self.log_test("Extension lookup sources_replied empty", False, f"Expected [], got {sources_replied}")
            
            # Check results is empty (no extension running)
            results = data.get("results", [])
            if results == []:
                self.log_test("Extension lookup results empty", True)
            else:
                self.log_test("Extension lookup results empty", False, f"Expected [], got {results}")
            
            print(f"📊 Extension lookup data: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test("Extension lookup", False, f"Exception: {e}")

    async def test_ext_jobs(self):
        """Test GET /api/ext/jobs (should return 200 with jobs array)"""
        print("\n🔍 Testing Extension Jobs endpoint...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/ext/jobs")
            
            if response.status_code != 200:
                self.log_test("Extension jobs status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension jobs status", True)
            
            try:
                data = response.json()
            except Exception as e:
                self.log_test("Extension jobs JSON", False, f"Invalid JSON: {e}")
                return
            
            self.log_test("Extension jobs JSON", True)
            
            # Check jobs field exists
            if "jobs" not in data:
                self.log_test("Extension jobs field", False, "Missing 'jobs' field")
            else:
                self.log_test("Extension jobs field", True)
                jobs = data["jobs"]
                if isinstance(jobs, list):
                    self.log_test("Extension jobs array", True, f"Found {len(jobs)} jobs")
                else:
                    self.log_test("Extension jobs array", False, f"Expected array, got {type(jobs)}")
            
            print(f"📊 Extension jobs data: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test("Extension jobs", False, f"Exception: {e}")

    async def test_ext_push(self):
        """Test POST /api/ext/push (should return 200 with ok:true)"""
        print("\n🔍 Testing Extension Push endpoint...")
        
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
                self.log_test("Extension push status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("Extension push status", True)
            
            try:
                data = response.json()
            except Exception as e:
                self.log_test("Extension push JSON", False, f"Invalid JSON: {e}")
                return
            
            self.log_test("Extension push JSON", True)
            
            # Check ok:true
            if data.get("ok") == True:
                self.log_test("Extension push ok:true", True)
            else:
                self.log_test("Extension push ok:true", False, f"Expected ok:true, got {data.get('ok')}")
            
            print(f"📊 Extension push data: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test("Extension push", False, f"Exception: {e}")

    async def test_health_after_auctionauto(self):
        """Test that health endpoint updates after AuctionAuto test"""
        print("\n🔍 Testing Health endpoint after AuctionAuto calls...")
        
        try:
            # First get initial health
            response1 = await self.client.get(f"{self.base_url}/api/ext/health")
            if response1.status_code != 200:
                self.log_test("Health before AuctionAuto", False, f"Status {response1.status_code}")
                return
            
            data1 = response1.json()
            initial_calls = data1.get("sources", {}).get("auctionauto", {}).get("calls", 0)
            initial_success = data1.get("sources", {}).get("auctionauto", {}).get("last_success_at")
            
            # Make an AuctionAuto call
            payload = {"vin": REAL_VIN_1}
            await self.client.post(f"{self.base_url}/api/ext/auctionauto/test", json=payload)
            
            # Wait a moment for metrics to update
            await asyncio.sleep(1)
            
            # Get health again
            response2 = await self.client.get(f"{self.base_url}/api/ext/health")
            if response2.status_code != 200:
                self.log_test("Health after AuctionAuto", False, f"Status {response2.status_code}")
                return
            
            data2 = response2.json()
            final_calls = data2.get("sources", {}).get("auctionauto", {}).get("calls", 0)
            final_success = data2.get("sources", {}).get("auctionauto", {}).get("last_success_at")
            
            # Check calls increased
            if final_calls > initial_calls:
                self.log_test("Health calls increased", True, f"{initial_calls} → {final_calls}")
            else:
                self.log_test("Health calls increased", False, f"Calls: {initial_calls} → {final_calls}")
            
            # Check last_success_at updated (if it was successful)
            if final_success and (not initial_success or final_success > initial_success):
                self.log_test("Health last_success_at updated", True)
            else:
                self.log_test("Health last_success_at updated", False, f"Success: {initial_success} → {final_success}")
            
        except Exception as e:
            self.log_test("Health after AuctionAuto", False, f"Exception: {e}")

    async def test_vin_service_chain(self):
        """Test GET /api/vin/{vin} (existing endpoint using vin_service chain)"""
        print(f"\n🔍 Testing VIN Service Chain with VIN: {REAL_VIN_1}...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/vin/{REAL_VIN_1}")
            
            if response.status_code != 200:
                self.log_test("VIN service status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("VIN service status", True)
            
            try:
                data = response.json()
            except Exception as e:
                self.log_test("VIN service JSON", False, f"Invalid JSON: {e}")
                return
            
            self.log_test("VIN service JSON", True)
            
            # Check found=true
            if data.get("found") == True:
                self.log_test("VIN service found", True)
            else:
                self.log_test("VIN service found", False, f"Expected found:true, got {data.get('found')}")
                return
            
            # Check source (can be SEARCH or AUCTIONAUTO)
            source = data.get("source", "")
            if source in ["SEARCH", "AUCTIONAUTO"]:
                self.log_test("VIN service source", True, f"Source: {source}")
            else:
                self.log_test("VIN service source", False, f"Expected SEARCH or AUCTIONAUTO, got {source}")
            
            print(f"📊 VIN service data: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test("VIN service", False, f"Exception: {e}")

    async def test_system_health(self):
        """Test GET /api/system/health (should still work after new code)"""
        print("\n🔍 Testing System Health endpoint...")
        
        try:
            response = await self.client.get(f"{self.base_url}/api/system/health")
            
            if response.status_code != 200:
                self.log_test("System health status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("System health status", True)
            
            try:
                data = response.json()
            except Exception as e:
                self.log_test("System health JSON", False, f"Invalid JSON: {e}")
                return
            
            self.log_test("System health JSON", True)
            
            # Check expected fields
            if data.get("status") == "healthy":
                self.log_test("System health status field", True)
            else:
                self.log_test("System health status field", False, f"Expected 'healthy', got {data.get('status')}")
            
            if data.get("service") == "bibi-v3.2":
                self.log_test("System health service field", True)
            else:
                self.log_test("System health service field", False, f"Expected 'bibi-v3.2', got {data.get('service')}")
            
            print(f"📊 System health data: {json.dumps(data, indent=2)}")
            
        except Exception as e:
            self.log_test("System health", False, f"Exception: {e}")

    async def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Multi-Source Resolver Backend Tests")
        print("=" * 60)
        
        # Test all endpoints as specified
        await self.test_health_endpoint()
        await self.test_auctionauto_real_vin_1()
        await self.test_auctionauto_real_vin_2()
        await self.test_auctionauto_synthetic_vin()
        await self.test_auctionauto_invalid_vin()
        await self.test_ext_lookup()
        await self.test_ext_jobs()
        await self.test_ext_push()
        await self.test_health_after_auctionauto()
        await self.test_vin_service_chain()
        await self.test_system_health()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
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
    tester = MultiSourceTester()
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