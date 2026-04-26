{
  "project": {
    "name": "BIBI Cars (Public Website)",
    "goal": "Replace the current mock UI with a dark-only, black + yellow utilitarian design that matches the provided screenshots 1:1 as closely as possible. Admin/Cabinet routes remain untouched.",
    "style_keywords": [
      "dark-only",
      "flat",
      "minimal",
      "utilitarian",
      "high data density",
      "auction-catalog",
      "black-yellow dealer look"
    ],
    "non_negotiables": {
      "theme": "dark-only",
      "background": "#000000",
      "cards": "#111111 / #1A1A1A",
      "accent": "#FFB020 (amber/orange-yellow)",
      "no_gradients": true,
      "no_shadows": true,
      "max_image_radius_px": 12,
      "uppercase_tracked_nav": true,
      "components": "Use shadcn/ui primitives from /src/components/ui (JS/JSX files in this repo).",
      "testing": "All interactive and key informational elements MUST include data-testid (kebab-case)."
    }
  },

  "brand_attributes": {
    "tone": ["strict", "professional", "transparent", "fast", "trustworthy"],
    "visual_personality": {
      "contrast": "very high (yellow on black)",
      "ornamentation": "none",
      "surfaces": "flat panels with 1px borders",
      "motion": "minimal micro-interactions only"
    }
  },

  "inspiration_sources": {
    "screenshots": {
      "home": "https://customer-assets.emergentagent.com/job_bibi-preview/artifacts/bztaq1dh_Homepage.png",
      "catalog": "https://customer-assets.emergentagent.com/job_bibi-preview/artifacts/kb4q2wj3_Catalog.png",
      "single_car": "https://customer-assets.emergentagent.com/job_bibi-preview/artifacts/e93s31i2_Single%20car.png",
      "about": "https://customer-assets.emergentagent.com/job_bibi-preview/artifacts/7fopzcrs_Single%20car%20%281%29.png",
      "footer": "https://customer-assets.emergentagent.com/job_bibi-preview/artifacts/pcmyp5bv_Footer.png"
    },
    "reference_notes": [
      "Density similar to Copart/IAAI listings, but friendlier due to warm yellow accent.",
      "Navigation labels are uppercase with tracking.",
      "Cards are rectangular, flat, with subtle 1px borders; no drop shadows."
    ]
  },

  "typography": {
    "font_loading": {
      "google_fonts": [
        {
          "family": "IBM Plex Sans",
          "weights": [300, 400, 500, 600, 700],
          "usage": "Body/UI text"
        },
        {
          "family": "Bebas Neue",
          "weights": [400],
          "usage": "Nav + section labels (uppercase tracked)"
        }
      ],
      "notes": [
        "Repo currently imports IBM Plex Sans + Cabinet Grotesk in index.css. Replace Cabinet Grotesk usage for public pages with Bebas Neue for nav/labels; keep IBM Plex Sans for body.",
        "Use font-feature-settings: 'ss01' where available; keep letter spacing explicit for uppercase labels."
      ]
    },
    "font_pairing": {
      "display": "Bebas Neue",
      "body": "IBM Plex Sans",
      "fallback": "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    },
    "scale": {
      "h1": {
        "class": "text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight",
        "line_height": "leading-[1.05]"
      },
      "h2": {
        "class": "text-base md:text-lg font-medium",
        "line_height": "leading-snug"
      },
      "h3": {
        "class": "text-xl font-semibold",
        "line_height": "leading-snug"
      },
      "section_title": {
        "class": "font-[Bebas_Neue] uppercase tracking-[0.14em] text-sm",
        "notes": "Use for sidebar section headers, footer headings, chips labels"
      },
      "body": {
        "class": "text-sm sm:text-base font-normal",
        "line_height": "leading-relaxed"
      },
      "caption": {
        "class": "text-xs text-muted-foreground",
        "line_height": "leading-snug"
      },
      "price": {
        "class": "text-2xl sm:text-3xl font-bold",
        "notes": "Use accent color for key prices"
      }
    }
  },

  "color_system": {
    "mode": "dark-only",
    "tokens_css_variables": {
      "notes": [
        "Implement via :root in /src/index.css (or a .dark-only scope for public pages).",
        "Use HSL tokens compatible with shadcn/ui."
      ],
      "css": ":root {\n  --background: 0 0% 0%;\n  --foreground: 0 0% 96%;\n\n  --card: 0 0% 7%;\n  --card-foreground: 0 0% 96%;\n\n  --popover: 0 0% 7%;\n  --popover-foreground: 0 0% 96%;\n\n  --primary: 40 100% 56%; /* #FFB020 */\n  --primary-foreground: 0 0% 0%;\n\n  --secondary: 0 0% 10%; /* #1A1A1A */\n  --secondary-foreground: 0 0% 96%;\n\n  --muted: 0 0% 12%;\n  --muted-foreground: 0 0% 70%;\n\n  --accent: 40 100% 56%;\n  --accent-foreground: 0 0% 0%;\n\n  --border: 0 0% 18%;\n  --input: 0 0% 18%;\n  --ring: 40 100% 56%;\n\n  --destructive: 0 84% 60%;\n  --destructive-foreground: 0 0% 98%;\n\n  --success: 142 70% 45%;\n  --success-foreground: 0 0% 0%;\n\n  --warning: 40 100% 56%;\n  --warning-foreground: 0 0% 0%;\n\n  --radius: 0.75rem;\n}\n"
    },
    "hex_palette": {
      "bg": "#000000",
      "panel": "#111111",
      "panel_2": "#1A1A1A",
      "border": "#2E2E2E",
      "text_primary": "#F2F2F2",
      "text_secondary": "#B8B8B8",
      "text_muted": "#8A8A8A",
      "accent": "#FFB020",
      "accent_hover": "#FEA500",
      "accent_pressed": "#E89400",
      "link": "#FFB020",
      "focus_ring": "#FFB020",
      "success": "#2BD576",
      "danger": "#FF4D4D"
    },
    "usage_rules": {
      "backgrounds": "Only solid colors. No gradients anywhere (per requirement).",
      "borders": "1px borders for cards/inputs; use border color #2E2E2E.",
      "text": "Primary text off-white; secondary gray; accent only for prices/CTAs/active states.",
      "contrast": "Ensure WCAG AA; avoid using accent for long paragraphs."
    }
  },

  "spacing_and_layout": {
    "spacing_scale": {
      "base": "Tailwind default spacing scale",
      "preferred": [
        "p-3/p-4 for dense cards",
        "p-6 for major sections",
        "gap-3/gap-4 for grids",
        "space-y-3/space-y-4 for stacks"
      ]
    },
    "grid": {
      "container": "max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8",
      "page_vertical_rhythm": "py-6 sm:py-10",
      "catalog_grid": {
        "desktop": "grid grid-cols-[280px_1fr] gap-6",
        "mobile": "single column; filters open in Drawer/Sheet"
      },
      "single_car_grid": {
        "desktop": "grid grid-cols-[1.2fr_0.8fr] gap-6",
        "below_gallery": "calculator is full-width section with 2-column split inside"
      }
    },
    "radii": {
      "global": "--radius = 12px",
      "cards": "rounded-xl",
      "inputs": "rounded-md (8px) or rounded-lg (10-12px)",
      "images": "rounded-lg max; never exceed 12px"
    },
    "borders": {
      "rule": "No shadows. Use border + subtle hover border color shift.",
      "classes": {
        "card": "border border-border bg-card",
        "hover": "hover:border-[#3A3A3A]"
      }
    }
  },

  "iconography": {
    "library": "lucide-react (already present via shadcn)",
    "stroke": "1.75",
    "sizes": {
      "nav": 18,
      "actions": 18,
      "chips": 16,
      "specs": 16
    },
    "recommended_icons": {
      "search": "Search",
      "user": "User",
      "heart": "Heart",
      "compare": "GitCompare",
      "copy": "Copy",
      "phone": "Phone",
      "chevron": "ChevronDown",
      "filter": "SlidersHorizontal",
      "car": "Car",
      "bike": "Bike",
      "truck": "Truck",
      "construction": "Construction"
    }
  },

  "motion": {
    "principles": [
      "Minimal, utilitarian motion only.",
      "No parallax, no decorative animations.",
      "Use short fades and border-color transitions for feedback."
    ],
    "durations": {
      "fast": "120ms",
      "base": "160ms",
      "slow": "220ms"
    },
    "easing": "cubic-bezier(0.2, 0.8, 0.2, 1)",
    "allowed_interactions": {
      "buttons": "hover: slight brightness; active: translate-y-[1px]",
      "cards": "hover: border becomes slightly lighter; no lift/shadow",
      "chips": "hover: bg becomes slightly lighter; active: accent bg",
      "cta_pulse": "Optional: subtle 1.5s opacity pulse on primary CTA only (not constant)."
    },
    "implementation_note": "Avoid transition: all. Use transition-colors, transition-opacity, transition-[border-color]."
  },

  "accessibility": {
    "focus": {
      "ring": "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black",
      "notes": "Ring must be visible on black; use ring-offset-black."
    },
    "keyboard": [
      "All menus, dialogs, sheets, pagination must be keyboard navigable (shadcn defaults).",
      "Ensure VIN search input and catalog filters are reachable in logical order."
    ],
    "contrast": [
      "Use #F2F2F2 for body text on #000/#111.",
      "Avoid long paragraphs in pure yellow.",
      "Use muted gray for helper text."
    ]
  },

  "component_path": {
    "shadcn_ui": {
      "button": "/app/frontend/src/components/ui/button.jsx",
      "input": "/app/frontend/src/components/ui/input.jsx",
      "textarea": "/app/frontend/src/components/ui/textarea.jsx",
      "select": "/app/frontend/src/components/ui/select.jsx",
      "tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "badge": "/app/frontend/src/components/ui/badge.jsx",
      "card": "/app/frontend/src/components/ui/card.jsx",
      "breadcrumb": "/app/frontend/src/components/ui/breadcrumb.jsx",
      "pagination": "/app/frontend/src/components/ui/pagination.jsx",
      "slider": "/app/frontend/src/components/ui/slider.jsx",
      "sheet": "/app/frontend/src/components/ui/sheet.jsx",
      "drawer": "/app/frontend/src/components/ui/drawer.jsx",
      "dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "accordion": "/app/frontend/src/components/ui/accordion.jsx",
      "separator": "/app/frontend/src/components/ui/separator.jsx",
      "skeleton": "/app/frontend/src/components/ui/skeleton.jsx",
      "scroll_area": "/app/frontend/src/components/ui/scroll-area.jsx",
      "sonner": "/app/frontend/src/components/ui/sonner.jsx"
    },
    "public_components_to_create": {
      "header": "src/components/public/PublicHeader.js",
      "footer": "src/components/public/PublicFooter.js",
      "vin_search": "src/components/public/VinSearchBar.js",
      "hero": "src/components/public/HomeHero.js",
      "catalog_filters": "src/components/public/CatalogFiltersSidebar.js",
      "catalog_chips": "src/components/public/CatalogActiveChips.js",
      "car_row_card": "src/components/public/CarRowCard.js",
      "car_gallery": "src/components/public/CarGallery.js",
      "car_calculator": "src/components/public/CarCalculator.js",
      "consultation_form": "src/components/public/ConsultationCTAForm.js",
      "have_question": "src/components/public/HaveAQuestionBlock.js",
      "language_switcher": "src/components/public/LanguageSwitcher.js",
      "seo": "src/components/public/SeoHead.js"
    }
  },

  "component_specs": {
    "logo": {
      "text": "BIBI CARS",
      "style": {
        "font": "IBM Plex Sans",
        "weight": 800,
        "italic": true,
        "transform": "uppercase",
        "tracking": "0.06em",
        "color": "accent",
        "speed_lines": "3 short horizontal bars left of the first 'B' (use CSS pseudo-elements)"
      },
      "data_testid": "site-logo"
    },

    "header": {
      "layout": {
        "desktop": "[logo] [nav] [vin search centered] [phones + lang + account] [CONTACT US button]",
        "mobile": "left: logo, right: burger + contact button; VIN search becomes full-width row below"
      },
      "nav": {
        "items": ["CATALOG", "CALCULATOR", "ABOUT US", "CONTACTS"],
        "style": "Bebas Neue, uppercase, tracking-wide, text-muted-foreground; active = text-primary + underline accent",
        "data_testid": "header-nav"
      },
      "vin_search": {
        "placeholder": "Search by VIN or lot number",
        "style": "Input with left Search icon; bg #111; border #2E2E2E; focus ring accent",
        "data_testid": "global-vin-search-input",
        "submit_testid": "global-vin-search-submit"
      },
      "phones": {
        "numbers": ["+359 875 313 158", "+359 897 884 804"],
        "style": "stacked or inline; white text; small label muted",
        "data_testid": "header-phone-numbers"
      },
      "language_switcher": {
        "options": ["ENG", "BG", "UA"],
        "style": "compact segmented control; active = accent text",
        "data_testid": "header-language-switcher"
      },
      "cta": {
        "label": "CONTACT US",
        "variant": "primary",
        "data_testid": "header-contact-us-button"
      }
    },

    "buttons": {
      "primary": {
        "use": "Main CTAs (CONTACT US, FIND, EXACT COST IN BULGARIA, SEND REQUEST)",
        "classes": "bg-primary text-primary-foreground hover:bg-[#FEA500] active:bg-[#E89400] rounded-md px-4 py-2 font-semibold uppercase tracking-[0.08em] transition-colors",
        "focus": "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      },
      "outline": {
        "use": "Secondary actions (ALL IMAGES, GO BACK TO CATALOG)",
        "classes": "border border-border bg-transparent text-foreground hover:border-[#3A3A3A] hover:text-primary rounded-md px-4 py-2 uppercase tracking-[0.08em] transition-colors"
      },
      "ghost": {
        "use": "Icon buttons (favorite/compare/copy)",
        "classes": "bg-transparent text-muted-foreground hover:text-primary hover:bg-[#111111] rounded-md p-2 transition-colors"
      }
    },

    "inputs": {
      "base": {
        "classes": "bg-[#111111] text-foreground placeholder:text-[#7A7A7A] border border-border rounded-md h-11 px-3 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        "notes": "No shadows. Keep height consistent across forms."
      },
      "select": {
        "component": "shadcn Select",
        "trigger_classes": "bg-[#111111] border border-border rounded-md h-11",
        "content_classes": "bg-[#111111] border border-border"
      }
    },

    "chips": {
      "active_filter_chip": {
        "classes": "inline-flex items-center gap-2 rounded-md border border-border bg-[#111111] px-3 py-1 text-xs text-foreground",
        "close_icon": "X",
        "data_testid_prefix": "active-filter-chip"
      },
      "reset_all": {
        "classes": "text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-primary transition-colors",
        "data_testid": "catalog-reset-all-filters"
      }
    },

    "badges": {
      "traded": {
        "component": "Badge",
        "classes": "bg-primary text-black uppercase tracking-[0.12em]",
        "data_testid": "car-status-traded"
      },
      "condition": {
        "classes": "bg-[#1A1A1A] border border-border text-foreground uppercase tracking-[0.12em]",
        "data_testid_prefix": "car-condition-badge"
      }
    },

    "car_row_card": {
      "layout": "horizontal: image (left) | center specs | right price/date/cta + icons",
      "container_classes": "border border-border bg-card rounded-xl p-4 flex gap-4",
      "image": {
        "classes": "w-[220px] h-[140px] object-cover rounded-lg",
        "lazy": true,
        "data_testid": "car-card-image"
      },
      "title": {
        "classes": "text-lg font-semibold text-foreground",
        "data_testid": "car-card-title"
      },
      "lot_vin": {
        "copy_button": "ghost icon button",
        "data_testid_lot": "car-card-lot",
        "data_testid_vin": "car-card-vin",
        "copy_testid_prefix": "copy-to-clipboard"
      },
      "specs": {
        "items": ["Mileage", "Engine", "Drive", "Damage", "Condition", "Auction"],
        "classes": "grid grid-cols-2 gap-x-6 gap-y-2 text-sm",
        "label_classes": "text-muted-foreground",
        "value_classes": "text-foreground font-semibold"
      },
      "right_panel": {
        "current_rate": {
          "classes": "text-2xl font-bold text-primary",
          "data_testid": "car-card-current-rate"
        },
        "auction_date": {
          "classes": "text-sm font-semibold text-foreground",
          "data_testid": "car-card-auction-date"
        },
        "cta": {
          "label": "EXACT COST IN BULGARIA",
          "data_testid": "car-card-exact-cost-button"
        },
        "icons": {
          "favorite": "Heart",
          "compare": "GitCompare",
          "data_testid_favorite": "car-card-favorite-button",
          "data_testid_compare": "car-card-compare-button"
        }
      },
      "responsive": {
        "mobile": "stack: image full width, title, specs in 2 cols, rate + CTA full width; icons row at top-right"
      }
    },

    "filter_sidebar": {
      "container": "sticky top-[88px] border border-border bg-card rounded-xl p-4",
      "vehicle_type_tabs": {
        "component": "Tabs",
        "items": ["Car", "Moto", "Truck", "Special"],
        "active": "bg-primary text-black",
        "inactive": "bg-[#111111] text-muted-foreground border border-border",
        "data_testid": "catalog-vehicle-type-tabs"
      },
      "sections": {
        "brand": "Select",
        "model": "Select",
        "year": "Slider (range 1900-2026)",
        "mileage": "Accordion",
        "auction": "Accordion",
        "condition": "Accordion",
        "fuel": "Accordion",
        "damage": "Accordion"
      },
      "mobile_behavior": {
        "component": "Sheet or Drawer",
        "trigger": "Filter+ button in chips row",
        "data_testid": "catalog-open-filters-button"
      }
    },

    "breadcrumbs": {
      "component": "Breadcrumb",
      "classes": "text-xs uppercase tracking-[0.12em] text-muted-foreground",
      "separator": "/",
      "data_testid": "page-breadcrumbs"
    },

    "pagination": {
      "component": "Pagination",
      "active": "bg-primary text-black",
      "inactive": "bg-transparent border border-border text-foreground",
      "data_testid": "catalog-pagination"
    },

    "consultation_form": {
      "section": {
        "bg": "#000",
        "border_top": "1px solid #2E2E2E",
        "padding": "py-10"
      },
      "headline": {
        "line1": "DON'T POSTPONE BUYING A CAR",
        "line1_classes": "text-primary font-bold text-3xl sm:text-4xl",
        "line2": "Free consultation",
        "line2_classes": "text-foreground font-bold text-3xl sm:text-4xl"
      },
      "form_layout": {
        "desktop": "grid grid-cols-2 gap-4",
        "mobile": "grid grid-cols-1 gap-3"
      },
      "fields": [
        "Full Name*",
        "Your Phone Number* (+359)",
        "Desired Car",
        "Your Budget*",
        "Additional Wishes (textarea)"
      ],
      "submit": {
        "label": "SEND REQUEST",
        "data_testid": "consultation-send-request-button"
      },
      "data_testids": {
        "name": "consultation-full-name-input",
        "phone": "consultation-phone-input",
        "desired_car": "consultation-desired-car-input",
        "budget": "consultation-budget-input",
        "wishes": "consultation-additional-wishes-textarea"
      }
    },

    "have_a_question_block": {
      "style": "border border-border rounded-xl p-6 bg-[#0B0B0B]",
      "title": "Have a question? Contact us",
      "phones": ["+359 875 313 158", "+359 897 884 804"],
      "data_testid": "have-a-question-block"
    },

    "footer": {
      "layout": {
        "desktop": "3 columns: logo+menu | phone+address | join group + social + CTA",
        "mobile": "stacked sections with separators"
      },
      "logo": "Large BIBI CARS mark in accent",
      "menu": ["CATALOG", "CALCULATOR", "ABOUT US", "BLOG"],
      "cta": {
        "label": "Get in touch",
        "variant": "primary",
        "data_testid": "footer-get-in-touch-button"
      },
      "social": {
        "icons": ["Instagram", "Facebook", "Telegram"],
        "style": "circular buttons with yellow background and black icon",
        "data_testid": "footer-social-links"
      },
      "legal_row": {
        "text": "© 2026. ALL RIGHT RESERVED. BIBI CARS / VAT BG206637283 / ID 206637283 / PM AUTO GROUP LTD / CONDITIONS / PRIVACY POLICY / COOKIES",
        "link_style": "uppercase tracked; hover accent",
        "data_testid": "footer-legal-row"
      }
    }
  },

  "page_layouts": {
    "home": {
      "route": "/",
      "sections": [
        {
          "name": "Header (global)",
          "notes": "Sticky; includes global VIN search."
        },
        {
          "name": "Hero",
          "layout": "Split: left text block + right hero car image. Under hero: a wide search bar with Brand/Model/Any Year + FIND.",
          "content": {
            "h1": "FROM AUCTION TO KEYS IN YOUR HANDS",
            "sub": "USA | EUROPE | KOREA",
            "stats": ["Over 5,000 cars", "Real-time bids", "500+ happy clients"]
          },
          "data_testids": {
            "hero": "home-hero",
            "find_button": "home-hero-find-button"
          }
        },
        {
          "name": "Top vehicles deals of the week",
          "layout": "Row of filter pills (10-15K etc) + grid of dark cards with trading date + image + price + More details.",
          "notes": "Cards are flat; hover only changes border color."
        },
        {
          "name": "Consultation CTA form (global)",
          "notes": "Same component reused on Catalog and Home."
        },
        {
          "name": "Footer (global)",
          "notes": "Matches Footer screenshot."
        }
      ]
    },

    "catalog": {
      "route": "/catalog",
      "layout": "Breadcrumbs + H1 + 2-col grid: sticky filters sidebar + results list",
      "top_row": "Active chips row: Found results + chips (Copart, year range) + Reset all + Filter+ (mobile)",
      "results": "Vertical stack of CarRowCard components",
      "pagination": "Centered pagination 1-5 with arrows",
      "bottom": "Consultation CTA form",
      "data_testids": {
        "page": "catalog-page",
        "chips": "catalog-active-chips",
        "results": "catalog-results-list"
      }
    },

    "single_car": {
      "route": "/catalog/:id",
      "layout": "Breadcrumbs + title row with favorite/compare icons; 2-col grid: gallery left, info right",
      "gallery": "Large image + 2x4 thumbs grid; last tile is ALL IMAGES button opening Dialog",
      "info_right": "Car Information card + Auction Details card + TRADED badge + primary CTA EXACT COST IN BULGARIA",
      "calculator": "Full-width section: left inputs + CTA + phone; right cost breakdown list",
      "after": "GO BACK TO CATALOG (outline) + Have-a-question block",
      "data_testids": {
        "page": "single-car-page",
        "all_images": "car-gallery-all-images-button",
        "exact_cost": "single-car-exact-cost-button",
        "calculator_submit": "car-calculator-complete-calculation-button"
      }
    },

    "calculator": {
      "route": "/calculator",
      "layout": "Standalone page reusing CarCalculator component; left inputs + right breakdown; include phone capture + submit CTA",
      "data_testid": "calculator-page"
    },

    "about": {
      "route": "/about",
      "layout": "Breadcrumbs + small title 'About us' + huge yellow pull-quote + 2 paragraphs + 2 images row + Services list",
      "services": [
        "Car delivery on order from the USA / Europe / Korea",
        "Sale of available cars from the USA / Europe / Korea",
        "Leasing"
      ],
      "data_testid": "about-page"
    },

    "contacts": {
      "route": "/contacts",
      "layout": "Breadcrumbs + title + office cards list (address, phones) + social links; keep same black/yellow style",
      "data_testid": "contacts-page"
    },

    "vin_check": {
      "route": "/vin-check",
      "layout": "Dedicated page with VIN input + results table; reuse VinSearchBar and Table components; keep dense, flat styling",
      "data_testid": "vin-check-page"
    },

    "blog": {
      "route": "/blog",
      "layout": "Placeholder page with heading + 'Coming soon' (no emojis).",
      "data_testid": "blog-page"
    }
  },

  "states": {
    "loading": {
      "use": "Skeleton component",
      "patterns": {
        "catalog_list": "3-6 skeleton row cards",
        "single_car_gallery": "image skeleton + thumbs skeleton",
        "calculator": "skeleton lines for breakdown"
      },
      "data_testid": "loading-state"
    },
    "empty": {
      "catalog": "Show 'No vehicles found' + Reset all filters button",
      "data_testid": "empty-state"
    },
    "error": {
      "pattern": "Alert component with destructive styling; include retry button",
      "data_testid": "error-state"
    },
    "toasts": {
      "library": "sonner",
      "use_cases": ["Copied VIN/LOT", "Consultation request sent", "Calculator error"],
      "data_testid": "toast"
    }
  },

  "performance_notes": {
    "catalog_virtualization": "If results > 100, virtualize list (react-window).",
    "images": "Use loading='lazy' for catalog images; for gallery, lazy-load thumbs and prefetch next image.",
    "seo": "Add JSON-LD Vehicle schema on single car; OpenGraph tags on Home/Catalog/Car."
  },

  "libraries": {
    "recommended": [
      {
        "name": "framer-motion",
        "use": "Subtle reveal on list items (opacity only) and sheet open/close",
        "install": "npm i framer-motion",
        "notes": "Keep motion minimal; no parallax."
      },
      {
        "name": "react-window",
        "use": "Catalog list virtualization",
        "install": "npm i react-window"
      }
    ]
  },

  "image_urls": {
    "policy": "Use backend vehicle images where available. For placeholders, use neutral dark automotive photos (no bright gradients).",
    "placeholders": {
      "hero": {
        "description": "Dark studio car shot (used only if backend hero image missing)",
        "url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=80"
      },
      "about_team": {
        "description": "Team/office photo placeholder",
        "url": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80"
      },
      "about_ceo": {
        "description": "Portrait placeholder",
        "url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80"
      }
    }
  },

  "instructions_to_main_agent": [
    "ONLY modify public pages/components: src/components/public/* and src/pages/public/* and routing in App.js for public routes. Do NOT touch /admin/* or /cabinet/*.",
    "Replace current light theme tokens in index.css with the dark-only tokens above for public pages. If admin relies on light tokens, scope public theme under a wrapper class on public layout (e.g., <div className='public-theme'>) and define tokens under .public-theme { ... }.",
    "Remove legacy App.css centered/CRA demo styles from public pages; do not add .App { text-align:center }.",
    "No gradients, no shadows. Use borders and spacing for separation.",
    "Implement header/footer exactly as screenshots: uppercase tracked nav, centered VIN search, phones, language switcher, account icon, yellow CONTACT US button.",
    "Catalog must use horizontal row cards with image left, specs center, price+date+CTA right, plus favorite/compare icons.",
    "Single car must match: gallery with thumbs + ALL IMAGES dialog; right info cards; calculator split; have-a-question block.",
    "Every interactive element and key info must include data-testid in kebab-case.",
    "Use shadcn components for inputs/selects/dialog/sheet/pagination/slider; do not use raw HTML dropdowns.",
    "Use sonner for toasts (copy VIN/LOT, form submit)."
  ],

  "general_ui_ux_design_guidelines_appendix": "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
}
