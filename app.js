---
layout: null
---
{% capture app01_source %}{% include_relative fragments/app-01.txt %}{% endcapture %}
{{ app01_source | replace: 'const APP_VERSION = "2.0";', 'const APP_VERSION = "2.20";' }}
{% include_relative fragments/app-02.txt %}
{% include_relative fragments/app-03.txt %}
{% include_relative fragments/app-04.txt %}
{% include_relative fragments/app-05.txt %}
{% include_relative fragments/app-06.txt %}
{% include_relative fragments/app-07.txt %}
{% include_relative fragments/app-08.txt %}
{% include_relative fragments/app-09.txt %}
{% include_relative fragments/app-10.txt %}
{% include_relative fragments/app-11.txt %}
{% include_relative fragments/app-12.txt %}
{% include_relative fragments/app-13.txt %}
{% include_relative fragments/app-14.txt %}
{% include_relative fragments/app-15.txt %}
{% capture v219_overlay %}{% include_relative fragments/app-v219-overlay.txt %}{% endcapture %}
{% capture v220_overlay %}{% include_relative fragments/app-v220-overlay.txt %}{% endcapture %}
{% assign combined_overlay = v219_overlay | replace: '  if (typeof globalThis !== "undefined") {', v220_overlay %}
{% capture app16_source %}{% include_relative fragments/app-16.txt %}{% endcapture %}
{% assign app16_v220 = app16_source | replace: 'APP_VERSION: "2.18"', 'APP_VERSION: "2.20"' %}
{{ app16_v220 | replace: '  if (typeof globalThis !== "undefined") {', combined_overlay }}