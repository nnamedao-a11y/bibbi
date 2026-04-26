#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================
# (protocol block preserved verbatim from template — see git history)
#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

user_problem_statement: |
  Переход с модели "shipment → vessel" на VIN-centric архитектуру:
  VIN → Shipment → Stages → Vessel/Container.
  Главное правило: при смене судна НЕ затираем старые данные, а создаём
  новый vessel-stage в stages[], сохраняя полную историю перевозки.

backend:
  - task: "VIN-centric bind /api/shipments/{id}/vessel (merge vs split)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Рефакторил legacy handler. Первый bind/same-ship = merge в активный stage. Разный MMSI/IMO → закрывает активный stage (status=done) и вставляет новый vessel-stage после него. Добавил container layer, forceNewStage, newStageLabel. Тесты в test_vin_journey.py все ПРОШЛИ."

  - task: "POST /api/shipments/bind-by-vin (VIN lookup)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Resolve shipment by VIN (case-insensitive), затем вызывает общий bind-хендлер. Unknown VIN → 404. Tested."

  - task: "POST /api/shipments/{id}/transfer-vessel (explicit transshipment)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Всегда forceNewStage=True, независимо от MMSI. Поддерживает transferPort для генерации label 'Перевалка в X'. Tested."

  - task: "GET /api/shipments/{id}/vessel-history"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Возвращает все vessel-stages с vessel + container + timestamps + isCurrent flag. Derived from stages[], без отдельной коллекции."

  - task: "Legacy /api/shipments/{id}/vessel endpoint (imo-only)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Переименован в /vessel/legacy-attach + include_in_schema=False. Новый VIN-centric хендлер (line 12668) теперь первым отвечает на /api/shipments/{id}/vessel."

frontend:
  - task: "Admin VesselFinderSessionPage: VIN-first bind form"
    implemented: true
    working: true
    file: "frontend/src/pages/admin/VesselFinderSessionPage.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
          agent: "main"
          comment: "Добавил: VIN (приоритетно, auto-resolve в Shipment ID), Container, Container seal, Label нового этапа, Force new stage checkbox, кнопка 'Сменить судно (перевалка)' с confirm-диалогом. Визуальная верификация через скриншот — форма отрисовывается корректно."

  - task: "Admin VesselFinderSessionPage: vessel history timeline"
    implemented: true
    working: true
    file: "frontend/src/pages/admin/VesselFinderSessionPage.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
        - working: true
          agent: "main"
          comment: "Блок 'История перевозки' с вертикальным timeline (done/active/pending), chip-ы для vessel name/MMSI/IMO/container. Автозагрузка при изменении Shipment ID."

  - task: "CabinetShipping (CustomerCabinet.js): VIN-centric ShipmentCard"
    implemented: true
    working: true
    file: "frontend/src/pages/CustomerCabinet.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
          agent: "main"
          comment: "Live pill (🟢/🟡/🔴), chip'ы для vessel/container/location, inline progress bar. Expanded view теперь использует JourneyPanel. Скриншот подтверждает корректный рендер: MSC OSCAR → AQUARIUS, MSKU1234567, 76% прогресс."

  - task: "JourneyPanel: Live overlay + Current vessel card + Vessel history"
    implemented: true
    working: true
    file: "frontend/src/components/shipping/JourneyPanel.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
          agent: "main"
          comment: "Glassmorphism overlay поверх карты (vessel name/speed/course/region/updated). Current vessel card (sky gradient, anchor+package icons). Vessel history chip-row с arrows между суднами. Container chips в stages timeline. Скриншот подтверждает: 2 перевалки, vessel history chips, full stages timeline."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "CabinetShipping (CustomerCabinet.js): VIN-centric ShipmentCard"
    - "JourneyPanel: Live overlay + Current vessel card + Vessel history"
    - "Admin VesselFinderSessionPage: VIN-first bind form"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: |
        Реализована VIN-centric vessel journey tracking.
        Backend: все 7 тестов в test_vin_journey.py ПРОШЛИ (create → bind A → merge → split to B → bind-by-vin → transfer → history).
        UI: admin bind-форма с VIN/Container + vessel history timeline. Client cabinet карточка с live pill + JourneyPanel (Live overlay + current vessel card + vessel history chip-row + stages timeline с container).

        Для тестирования UI нужно:
          1. Тестовый shipment уже создан: id=ship_1776859860_bce90c81, customerId=cust_demo_56d197, VIN=DEMOUX-934EDD6E, с историей перевалки MSC OSCAR → AQUARIUS (контейнер MSKU1234567).
          2. Кабинет клиента: /cabinet/cust_demo_56d197/shipping (публичный, без auth).
          3. Admin VF page: /admin/vesselfinder (нужен admin login: admin@crm.com / admin123).
          4. Критический UX для проверки: (a) live pill отображает правильный статус, (b) при разворачивании карты виден overlay с vessel info, (c) отображается vessel history chip-row с MSC OSCAR → AQUARIUS, (d) в stages timeline виден container.

        ⚠ NOTE: карта использует тестовый маршрут → live-трекинг показывает 'simulated' или 'real_scraped' (в зависимости от тика). Статус 'Live' станет зелёным только когда придут real AIS-координаты через VF extension; сейчас ожидаемо 'Estimated' (желтый).
