# Changelog

## [2.0.0](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/compare/server-v1.0.0...server-v2.0.0) (2026-10-24)


### ⚠ BREAKING CHANGES

* **api:** POST /api/event-types больше не принимает durationMinutes; в ответе EventType поля тоже нет.

### Features

* **api:** fix slot length at 30 minutes and drop type duration ([e4626ac](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/commit/e4626acbb52629c551a0a0ee73594412fcef2d98))
* **server:** add booking creation with occupancy guard ([ed12a4e](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/commit/ed12a4e1b1f1fcd69e214a8287c3acca492c430b)), closes [#22](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/issues/22)
* **server:** add event type slots grid endpoint ([99b416f](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/commit/99b416fbf72db9e0f7bb117896594aeee3ec8088))
* **server:** add event types API and mount contract router ([20aa407](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/commit/20aa407de847679e12885c7691cd455fdaf80ae8))
* **server:** add Express API skeleton ([abe40aa](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/commit/abe40aaaf65b7b63447260d6d1684c6cb0503594))
* **server:** add upcoming bookings list endpoint ([7f2b44c](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/commit/7f2b44c52948f80a1876f570ed690beec3fa4f01)), closes [#24](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/issues/24)
* **server:** generate artifacts and validate requests from contract ([4a9ecf4](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/commit/4a9ecf4be9758357b352d1c72998babe55ac164a))
* **server:** unify error envelope with machine codes ([037d37e](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/commit/037d37e13a2d928c99673e7c3e6c1a666a22576d))


### Bug Fixes

* **server:** answer 200 on the root for the container check ([d80ff68](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/commit/d80ff68b96786d6ab7a59757e969e8be38bc56ed))
