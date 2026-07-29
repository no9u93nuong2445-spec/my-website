---
layout: null
---
{% capture app01_source %}{% include_relative fragments/app-01.txt %}{% endcapture %}
{{ app01_source | replace: 'const APP_VERSION = "2.0";', 'const APP_VERSION = "2.19";' }}
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
{% capture app16_source %}{% include_relative fragments/app-16.txt %}{% endcapture %}
{% assign app16_v219 = app16_source | replace: 'APP_VERSION: "2.18"', 'APP_VERSION: "2.19"' %}
{{ app16_v219 | replace: '  if (typeof globalThis !== "undefined") {', v219_overlay }}
