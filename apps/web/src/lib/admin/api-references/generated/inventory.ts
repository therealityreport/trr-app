/* eslint-disable */
import type { AdminApiReferenceInventory } from "@/lib/admin/api-references/types";

export const GENERATED_ADMIN_API_REFERENCE_INVENTORY = {
  "inventorySchemaVersion": "1.0.0",
  "generatorVersion": "1.0.0",
  "generatedAt": "2026-04-14T03:54:15.360Z",
  "sourceCommitSha": "23227b232d514e14b4c772a010dfdd46fab3807b",
  "overrideDigest": "a29b267e3edd1915ce8b856036892160e0fbd1171e516987d38acd697ee8676b",
  "nodes": [
    {
      "id": "backend:DELETE:/api/v1/admin/brands/logos/options/saved/[assetId]",
      "kind": "backend_endpoint",
      "title": "DELETE /api/v1/admin/brands/logos/options/saved/[assetId]",
      "pathPattern": "/api/v1/admin/brands/logos/options/saved/[assetId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/saved/[assetId]/route.ts",
      "sourceLocator": {
        "line": 22,
        "matchedText": "`/admin/brands/logos/options/saved/${encodeURIComponent((await context.params).assetId)}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:DELETE:/api/v1/admin/covered-shows/[showId]",
      "kind": "backend_endpoint",
      "title": "DELETE /api/v1/admin/covered-shows/[showId]",
      "pathPattern": "/api/v1/admin/covered-shows/[showId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/covered-shows/[showId]/route.ts",
      "sourceLocator": {
        "line": 149,
        "matchedText": "`/admin/covered-shows/${showId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:DELETE:/api/v1/admin/media-assets/[assetId]",
      "kind": "backend_endpoint",
      "title": "DELETE /api/v1/admin/media-assets/[assetId]",
      "pathPattern": "/api/v1/admin/media-assets/[assetId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/route.ts",
      "sourceLocator": {
        "line": 26,
        "matchedText": "`/admin/media-assets/${assetId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:DELETE:/api/v1/admin/shows/[showId]/links/[linkId]",
      "kind": "backend_endpoint",
      "title": "DELETE /api/v1/admin/shows/[showId]/links/[linkId]",
      "pathPattern": "/api/v1/admin/shows/[showId]/links/[linkId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/[linkId]/route.ts",
      "sourceLocator": {
        "line": 63,
        "matchedText": "`/admin/shows/${showId}/links/${linkId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:DELETE:/api/v1/admin/shows/networks-streaming/overrides/[id]",
      "kind": "backend_endpoint",
      "title": "DELETE /api/v1/admin/shows/networks-streaming/overrides/[id]",
      "pathPattern": "/api/v1/admin/shows/networks-streaming/overrides/[id]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/networks-streaming/overrides/[id]/route.ts",
      "sourceLocator": {
        "line": 111,
        "matchedText": "`/admin/shows/networks-streaming/overrides/${params.id}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:DELETE:/api/v1/admin/social-posts/[postId]",
      "kind": "backend_endpoint",
      "title": "DELETE /api/v1/admin/social-posts/[postId]",
      "pathPattern": "/api/v1/admin/social-posts/[postId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/social-posts/[postId]/route.ts",
      "sourceLocator": {
        "line": 183,
        "matchedText": "`/admin/social-posts/${postId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:GET:/api/v1/admin/brands/families",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/brands/families",
      "pathPattern": "/api/v1/admin/brands/families",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/route.ts",
      "sourceLocator": {
        "line": 52,
        "matchedText": "\"/admin/brands/families\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:GET:/api/v1/admin/brands/families/[familyId]/links",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/brands/families/[familyId]/links",
      "pathPattern": "/api/v1/admin/brands/families/[familyId]/links",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/links/route.ts",
      "sourceLocator": {
        "line": 55,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/links`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:GET:/api/v1/admin/brands/families/[familyId]/wikipedia-show-urls",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/brands/families/[familyId]/wikipedia-show-urls",
      "pathPattern": "/api/v1/admin/brands/families/[familyId]/wikipedia-show-urls",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/wikipedia-show-urls/route.ts",
      "sourceLocator": {
        "line": 16,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/wikipedia-show-urls`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/brands/families/by-entity",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/brands/families/by-entity",
      "pathPattern": "/api/v1/admin/brands/families/by-entity",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/by-entity/route.ts",
      "sourceLocator": {
        "line": 11,
        "matchedText": "\"/admin/brands/families/by-entity\""
      },
      "provenance": "manual_override",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "manual_override:brands_family_lookup"
      ],
      "usageTier": "medium",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/brands/families/suggestions",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/brands/families/suggestions",
      "pathPattern": "/api/v1/admin/brands/families/suggestions",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/suggestions/route.ts",
      "sourceLocator": {
        "line": 11,
        "matchedText": "\"/admin/brands/families/suggestions\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/brands/franchise-rules",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/brands/franchise-rules",
      "pathPattern": "/api/v1/admin/brands/franchise-rules",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/franchise-rules/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "\"/admin/brands/franchise-rules\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/brands/logo-targets",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/brands/logo-targets",
      "pathPattern": "/api/v1/admin/brands/logo-targets",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/logo-targets/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logo-targets\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/brands/logos/options/modal",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/brands/logos/options/modal",
      "pathPattern": "/api/v1/admin/brands/logos/options/modal",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/modal/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/modal\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/brands/logos/options/source-suggestions",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/brands/logos/options/source-suggestions",
      "pathPattern": "/api/v1/admin/brands/logos/options/source-suggestions",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/source-suggestions/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/source-suggestions\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/brands/logos/options/sources",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/brands/logos/options/sources",
      "pathPattern": "/api/v1/admin/brands/logos/options/sources",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/sources/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/sources\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/bravotv/images/people/[personId]/latest",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/bravotv/images/people/[personId]/latest",
      "pathPattern": "/api/v1/admin/bravotv/images/people/[personId]/latest",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/people/[personId]/latest/route.ts",
      "sourceLocator": {
        "line": 13,
        "matchedText": "`/admin/bravotv/images/people/${personId}/latest`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/bravotv/images/shows/[showId]/latest",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/bravotv/images/shows/[showId]/latest",
      "pathPattern": "/api/v1/admin/bravotv/images/shows/[showId]/latest",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/shows/[showId]/latest/route.ts",
      "sourceLocator": {
        "line": 13,
        "matchedText": "`/admin/bravotv/images/shows/${showId}/latest`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/covered-shows/[showId]",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/covered-shows/[showId]",
      "pathPattern": "/api/v1/admin/covered-shows/[showId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/covered-shows/[showId]/route.ts",
      "sourceLocator": {
        "line": 149,
        "matchedText": "`/admin/covered-shows/${showId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/operations/[operationId]",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/operations/[operationId]",
      "pathPattern": "/api/v1/admin/operations/[operationId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/operations/[operationId]/route.ts",
      "sourceLocator": {
        "line": 26,
        "matchedText": "`/admin/operations/${operationId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/operations/[operationId]/stream",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/operations/[operationId]/stream",
      "pathPattern": "/api/v1/admin/operations/[operationId]/stream",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/operations/[operationId]/stream/route.ts",
      "sourceLocator": {
        "line": 35,
        "matchedText": "`/admin/operations/${operationId}/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "medium",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:GET:/api/v1/admin/operations/health",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/operations/health",
      "pathPattern": "/api/v1/admin/operations/health",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/operations/health/route.ts",
      "sourceLocator": {
        "line": 14,
        "matchedText": "\"/admin/operations/health\""
      },
      "provenance": "manual_override",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "manual_override:backend_health_surface"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/people/[personId]/socialblade",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/people/[personId]/socialblade",
      "pathPattern": "/api/v1/admin/people/[personId]/socialblade",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/social-growth/route.ts",
      "sourceLocator": {
        "line": 37,
        "matchedText": "`/admin/people/${personId}/socialblade?handle=${encodeURIComponent(handle)}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/person/[personId]/fandom",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/person/[personId]/fandom",
      "pathPattern": "/api/v1/admin/person/[personId]/fandom",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/fandom/route.ts",
      "sourceLocator": {
        "line": 31,
        "matchedText": "`/admin/person/${personId}/fandom`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/shows/[showId]/bravo/news",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/shows/[showId]/bravo/news",
      "pathPattern": "/api/v1/admin/shows/[showId]/bravo/news",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/bravo/news/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/shows/${showId}/bravo/news`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/shows/[showId]/bravo/videos",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/shows/[showId]/bravo/videos",
      "pathPattern": "/api/v1/admin/shows/[showId]/bravo/videos",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/bravo/videos/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/shows/${showId}/bravo/videos`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/shows/[showId]/cast-role-members",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/shows/[showId]/cast-role-members",
      "pathPattern": "/api/v1/admin/shows/[showId]/cast-role-members",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/cast-role-members/route.ts",
      "sourceLocator": {
        "line": 84,
        "matchedText": "`/admin/shows/${showId}/cast-role-members`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/shows/[showId]/google-news/sync/[jobId]",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/shows/[showId]/google-news/sync/[jobId]",
      "pathPattern": "/api/v1/admin/shows/[showId]/google-news/sync/[jobId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]/route.ts",
      "sourceLocator": {
        "line": 53,
        "matchedText": "`/admin/shows/${showId}/google-news/sync/${jobId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/shows/[showId]/links",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/shows/[showId]/links",
      "pathPattern": "/api/v1/admin/shows/[showId]/links",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/route.ts",
      "sourceLocator": {
        "line": 47,
        "matchedText": "`/admin/shows/${showId}/links`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:GET:/api/v1/admin/shows/[showId]/news",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/shows/[showId]/news",
      "pathPattern": "/api/v1/admin/shows/[showId]/news",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/news/route.ts",
      "sourceLocator": {
        "line": 48,
        "matchedText": "`/admin/shows/${showId}/news`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/shows/[showId]/roles",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/shows/[showId]/roles",
      "pathPattern": "/api/v1/admin/shows/[showId]/roles",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/roles/route.ts",
      "sourceLocator": {
        "line": 218,
        "matchedText": "`/admin/shows/${showId}/roles`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:GET:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/fandom",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/shows/[showId]/seasons/[seasonNumber]/fandom",
      "pathPattern": "/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/fandom",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/shows/${showId}/seasons/${seasonNumber}/fandom`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:GET:/api/v1/admin/shows/[showKey]/icons",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/shows/[showKey]/icons",
      "pathPattern": "/api/v1/admin/shows/[showKey]/icons",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/shows/[showKey]/icons/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/shows/${encodeURIComponent(showKey)}/icons`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:GET:/api/v1/admin/shows/networks-streaming/overrides",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/shows/networks-streaming/overrides",
      "pathPattern": "/api/v1/admin/shows/networks-streaming/overrides",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/networks-streaming/overrides/route.ts",
      "sourceLocator": {
        "line": 106,
        "matchedText": "\"/admin/shows/networks-streaming/overrides\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:GET:/api/v1/admin/social-posts/[postId]",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/social-posts/[postId]",
      "pathPattern": "/api/v1/admin/social-posts/[postId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/social-posts/[postId]/route.ts",
      "sourceLocator": {
        "line": 183,
        "matchedText": "`/admin/social-posts/${postId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:GET:/api/v1/admin/socials/live-status/stream",
      "kind": "backend_endpoint",
      "title": "GET /api/v1/admin/socials/live-status/stream",
      "pathPattern": "/api/v1/admin/socials/live-status/stream",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/live-status/stream/route.ts",
      "sourceLocator": {
        "line": 11,
        "matchedText": "\"/admin/socials/live-status/stream\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "medium",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:PATCH:/api/v1/admin/brands/families/[familyId]",
      "kind": "backend_endpoint",
      "title": "PATCH /api/v1/admin/brands/families/[familyId]",
      "pathPattern": "/api/v1/admin/brands/families/[familyId]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/route.ts",
      "sourceLocator": {
        "line": 16,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:PATCH:/api/v1/admin/brands/families/[familyId]/links/[ruleId]`,\n    );\n    if (!backendUrl) return NextResponse.json({ error: \"Backend API not configured\" }, { status: 500 });\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) return NextResponse.json({ error: \"Backend auth not configured\" }, { status: 500 });\n\n    const body =\n      request.headers.get(\"content-type",
      "kind": "backend_endpoint",
      "title": "PATCH /api/v1/admin/brands/families/[familyId]/links/[ruleId]`,\n    );\n    if (!backendUrl) return NextResponse.json({ error: \"Backend API not configured\" }, { status: 500 });\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) return NextResponse.json({ error: \"Backend auth not configured\" }, { status: 500 });\n\n    const body =\n      request.headers.get(\"content-type",
      "pathPattern": "/api/v1/admin/brands/families/[familyId]/links/[ruleId]`,\n    );\n    if (!backendUrl) return NextResponse.json({ error: \"Backend API not configured\" }, { status: 500 });\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) return NextResponse.json({ error: \"Backend auth not configured\" }, { status: 500 });\n\n    const body =\n      request.headers.get(\"content-type",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/links/[ruleId]/route.ts",
      "sourceLocator": {
        "line": 16,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/links/${encodeURIComponent(ruleId)}`,\n    );\n    if (!backendUrl) return NextResponse.json({ error: \"Backend API not configured\" }, { status: 500 });\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) return NextResponse.json({ error: \"Backend auth not configured\" }, { status: 500 });\n\n    const body =\n      request.headers.get(\"content-type\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:PATCH:/api/v1/admin/shows/[showId]/links/[linkId]",
      "kind": "backend_endpoint",
      "title": "PATCH /api/v1/admin/shows/[showId]/links/[linkId]",
      "pathPattern": "/api/v1/admin/shows/[showId]/links/[linkId]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/[linkId]/route.ts",
      "sourceLocator": {
        "line": 63,
        "matchedText": "`/admin/shows/${showId}/links/${linkId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:PATCH:/api/v1/admin/shows/[showId]/roles/[roleId]",
      "kind": "backend_endpoint",
      "title": "PATCH /api/v1/admin/shows/[showId]/roles/[roleId]",
      "pathPattern": "/api/v1/admin/shows/[showId]/roles/[roleId]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/roles/[roleId]/route.ts",
      "sourceLocator": {
        "line": 22,
        "matchedText": "`/admin/shows/${showId}/roles/${roleId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:PATCH:/api/v1/admin/shows/networks-streaming/overrides/[id]",
      "kind": "backend_endpoint",
      "title": "PATCH /api/v1/admin/shows/networks-streaming/overrides/[id]",
      "pathPattern": "/api/v1/admin/shows/networks-streaming/overrides/[id]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/networks-streaming/overrides/[id]/route.ts",
      "sourceLocator": {
        "line": 111,
        "matchedText": "`/admin/shows/networks-streaming/overrides/${params.id}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/assets/archive",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/assets/archive",
      "pathPattern": "/api/v1/admin/assets/archive",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/assets/archive/route.ts",
      "sourceLocator": {
        "line": 17,
        "matchedText": "\"/admin/assets/archive\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/assets/content-type",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/assets/content-type",
      "pathPattern": "/api/v1/admin/assets/content-type",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/assets/content-type/route.ts",
      "sourceLocator": {
        "line": 17,
        "matchedText": "\"/admin/assets/content-type\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/assets/star",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/assets/star",
      "pathPattern": "/api/v1/admin/assets/star",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/assets/star/route.ts",
      "sourceLocator": {
        "line": 17,
        "matchedText": "\"/admin/assets/star\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/brands/families",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/brands/families",
      "pathPattern": "/api/v1/admin/brands/families",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/route.ts",
      "sourceLocator": {
        "line": 52,
        "matchedText": "\"/admin/brands/families\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/brands/families/[familyId]/links",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/brands/families/[familyId]/links",
      "pathPattern": "/api/v1/admin/brands/families/[familyId]/links",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/links/route.ts",
      "sourceLocator": {
        "line": 55,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/links`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/brands/families/[familyId]/links/apply",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/brands/families/[familyId]/links/apply",
      "pathPattern": "/api/v1/admin/brands/families/[familyId]/links/apply",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/links/apply/route.ts",
      "sourceLocator": {
        "line": 16,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/links/apply`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/brands/families/[familyId]/members",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/brands/families/[familyId]/members",
      "pathPattern": "/api/v1/admin/brands/families/[familyId]/members",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/members/route.ts",
      "sourceLocator": {
        "line": 16,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/members`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/brands/families/[familyId]/wikipedia-import",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/brands/families/[familyId]/wikipedia-import",
      "pathPattern": "/api/v1/admin/brands/families/[familyId]/wikipedia-import",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/wikipedia-import/route.ts",
      "sourceLocator": {
        "line": 16,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/wikipedia-import`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/brands/franchise-rules/[franchiseKey]/apply",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/brands/franchise-rules/[franchiseKey]/apply",
      "pathPattern": "/api/v1/admin/brands/franchise-rules/[franchiseKey]/apply",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/apply/route.ts",
      "sourceLocator": {
        "line": 25,
        "matchedText": "`/admin/brands/franchise-rules/${encodeURIComponent(franchiseKey)}/apply`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/brands/logos/options/assign",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/brands/logos/options/assign",
      "pathPattern": "/api/v1/admin/brands/logos/options/assign",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/assign/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/assign\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/brands/logos/options/discover",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/brands/logos/options/discover",
      "pathPattern": "/api/v1/admin/brands/logos/options/discover",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/discover/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/discover\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/brands/logos/options/select",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/brands/logos/options/select",
      "pathPattern": "/api/v1/admin/brands/logos/options/select",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/select/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/select\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/brands/logos/options/source-query",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/brands/logos/options/source-query",
      "pathPattern": "/api/v1/admin/brands/logos/options/source-query",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/source-query/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/source-query\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/brands/logos/sync",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/brands/logos/sync",
      "pathPattern": "/api/v1/admin/brands/logos/sync",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/sync/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/sync\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/bravotv/images/people/[personId]/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/bravotv/images/people/[personId]/stream",
      "pathPattern": "/api/v1/admin/bravotv/images/people/[personId]/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/people/[personId]/stream/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/bravotv/images/people/${personId}/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/bravotv/images/shows/[showId]/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/bravotv/images/shows/[showId]/stream",
      "pathPattern": "/api/v1/admin/bravotv/images/shows/[showId]/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/shows/[showId]/stream/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/bravotv/images/shows/${showId}/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/cast-photos/[photoId]/auto-count",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/cast-photos/[photoId]/auto-count",
      "pathPattern": "/api/v1/admin/cast-photos/[photoId]/auto-count",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/auto-count/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/cast-photos/${photoId}/auto-count`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/cast-photos/[photoId]/detect-text-overlay",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/cast-photos/[photoId]/detect-text-overlay",
      "pathPattern": "/api/v1/admin/cast-photos/[photoId]/detect-text-overlay",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/detect-text-overlay/route.ts",
      "sourceLocator": {
        "line": 47,
        "matchedText": "`/admin/cast-photos/${photoId}/detect-text-overlay`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/cast-photos/[photoId]/mirror",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/cast-photos/[photoId]/mirror",
      "pathPattern": "/api/v1/admin/cast-photos/[photoId]/mirror",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/mirror/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/cast-photos/${photoId}/mirror`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/cast-photos/[photoId]/variants",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/cast-photos/[photoId]/variants",
      "pathPattern": "/api/v1/admin/cast-photos/[photoId]/variants",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/variants/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/cast-photos/${photoId}/variants`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/media-assets/[assetId]/auto-count",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/media-assets/[assetId]/auto-count",
      "pathPattern": "/api/v1/admin/media-assets/[assetId]/auto-count",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/auto-count/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/media-assets/${assetId}/auto-count`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/media-assets/[assetId]/detect-text-overlay",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/media-assets/[assetId]/detect-text-overlay",
      "pathPattern": "/api/v1/admin/media-assets/[assetId]/detect-text-overlay",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/detect-text-overlay/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/media-assets/${assetId}/detect-text-overlay`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/media-assets/[assetId]/mirror",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/media-assets/[assetId]/mirror",
      "pathPattern": "/api/v1/admin/media-assets/[assetId]/mirror",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/mirror/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/media-assets/${assetId}/mirror`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/media-assets/[assetId]/replace-from-url",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/media-assets/[assetId]/replace-from-url",
      "pathPattern": "/api/v1/admin/media-assets/[assetId]/replace-from-url",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/replace-from-url/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/media-assets/${assetId}/replace-from-url`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/media-assets/[assetId]/reverse-image-search",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/media-assets/[assetId]/reverse-image-search",
      "pathPattern": "/api/v1/admin/media-assets/[assetId]/reverse-image-search",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/reverse-image-search/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/media-assets/${assetId}/reverse-image-search`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/media-assets/[assetId]/variants",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/media-assets/[assetId]/variants",
      "pathPattern": "/api/v1/admin/media-assets/[assetId]/variants",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/variants/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/media-assets/${assetId}/variants`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/operations/[operationId]/cancel",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/operations/[operationId]/cancel",
      "pathPattern": "/api/v1/admin/operations/[operationId]/cancel",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/operations/[operationId]/cancel/route.ts",
      "sourceLocator": {
        "line": 26,
        "matchedText": "`/admin/operations/${operationId}/cancel`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/operations/cancel",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/operations/cancel",
      "pathPattern": "/api/v1/admin/operations/cancel",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/operations/cancel/route.ts",
      "sourceLocator": {
        "line": 13,
        "matchedText": "\"/admin/operations/cancel\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/operations/stale/cancel",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/operations/stale/cancel",
      "pathPattern": "/api/v1/admin/operations/stale/cancel",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/operations/stale/cancel/route.ts",
      "sourceLocator": {
        "line": 12,
        "matchedText": "\"/admin/operations/stale/cancel\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/people/[personId]/socialblade/refresh",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/people/[personId]/socialblade/refresh",
      "pathPattern": "/api/v1/admin/people/[personId]/socialblade/refresh",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/social-growth/refresh/route.ts",
      "sourceLocator": {
        "line": 35,
        "matchedText": "`/admin/people/${personId}/socialblade/refresh`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/people/socialblade/refresh-batch",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/people/socialblade/refresh-batch",
      "pathPattern": "/api/v1/admin/people/socialblade/refresh-batch",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social-growth/refresh-batch/route.ts",
      "sourceLocator": {
        "line": 30,
        "matchedText": "\"/admin/people/socialblade/refresh-batch\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/person/[personId]/import-fandom/commit",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/person/[personId]/import-fandom/commit",
      "pathPattern": "/api/v1/admin/person/[personId]/import-fandom/commit",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/import-fandom/commit/route.ts",
      "sourceLocator": {
        "line": 27,
        "matchedText": "`/admin/person/${personId}/import-fandom/commit`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/person/[personId]/import-fandom/preview",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/person/[personId]/import-fandom/preview",
      "pathPattern": "/api/v1/admin/person/[personId]/import-fandom/preview",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/import-fandom/preview/route.ts",
      "sourceLocator": {
        "line": 24,
        "matchedText": "`/admin/person/${personId}/import-fandom/preview`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/person/[personId]/refresh-images",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/person/[personId]/refresh-images",
      "pathPattern": "/api/v1/admin/person/[personId]/refresh-images",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/refresh-images/route.ts",
      "sourceLocator": {
        "line": 88,
        "matchedText": "`/admin/person/${personId}/refresh-images`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/person/[personId]/refresh-images/getty-enrichment",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/person/[personId]/refresh-images/getty-enrichment",
      "pathPattern": "/api/v1/admin/person/[personId]/refresh-images/getty-enrichment",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment/route.ts",
      "sourceLocator": {
        "line": 35,
        "matchedText": "`/admin/person/${personId}/refresh-images/getty-enrichment`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/person/[personId]/refresh-images/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/person/[personId]/refresh-images/stream",
      "pathPattern": "/api/v1/admin/person/[personId]/refresh-images/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/refresh-images/stream/route.ts",
      "sourceLocator": {
        "line": 238,
        "matchedText": "`/admin/person/${personId}/refresh-images/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/person/[personId]/refresh-profile/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/person/[personId]/refresh-profile/stream",
      "pathPattern": "/api/v1/admin/person/[personId]/refresh-profile/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/refresh-profile/stream/route.ts",
      "sourceLocator": {
        "line": 238,
        "matchedText": "`/admin/person/${personId}/refresh-profile/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/person/[personId]/reprocess-images/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/person/[personId]/reprocess-images/stream",
      "pathPattern": "/api/v1/admin/person/[personId]/reprocess-images/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/reprocess-images/stream/route.ts",
      "sourceLocator": {
        "line": 212,
        "matchedText": "`/admin/person/${personId}/reprocess-images/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/scrape/import",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/scrape/import",
      "pathPattern": "/api/v1/admin/scrape/import",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/scrape/import/route.ts",
      "sourceLocator": {
        "line": 79,
        "matchedText": "\"/admin/scrape/import\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/scrape/import/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/scrape/import/stream",
      "pathPattern": "/api/v1/admin/scrape/import/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/scrape/import/stream/route.ts",
      "sourceLocator": {
        "line": 105,
        "matchedText": "\"/admin/scrape/import/stream\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "medium",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/scrape/preview",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/scrape/preview",
      "pathPattern": "/api/v1/admin/scrape/preview",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/scrape/preview/route.ts",
      "sourceLocator": {
        "line": 41,
        "matchedText": "\"/admin/scrape/preview\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/assets/batch-jobs/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/assets/batch-jobs/stream",
      "pathPattern": "/api/v1/admin/shows/[showId]/assets/batch-jobs/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream/route.ts",
      "sourceLocator": {
        "line": 199,
        "matchedText": "`/admin/shows/${showId}/assets/batch-jobs/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/auto-count-images",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/auto-count-images",
      "pathPattern": "/api/v1/admin/shows/[showId]/auto-count-images",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/auto-count-images/route.ts",
      "sourceLocator": {
        "line": 42,
        "matchedText": "`/admin/shows/${showId}/auto-count-images`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/bravo/videos/sync-thumbnails",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/bravo/videos/sync-thumbnails",
      "pathPattern": "/api/v1/admin/shows/[showId]/bravo/videos/sync-thumbnails",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails/route.ts",
      "sourceLocator": {
        "line": 47,
        "matchedText": "`/admin/shows/${showId}/bravo/videos/sync-thumbnails`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/cast-matrix/sync",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/cast-matrix/sync",
      "pathPattern": "/api/v1/admin/shows/[showId]/cast-matrix/sync",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/cast-matrix/sync/route.ts",
      "sourceLocator": {
        "line": 25,
        "matchedText": "`/admin/shows/${showId}/cast-matrix/sync`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/cast/[personId]/roles",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/cast/[personId]/roles",
      "pathPattern": "/api/v1/admin/shows/[showId]/cast/[personId]/roles",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/cast/[personId]/roles/route.ts",
      "sourceLocator": {
        "line": 18,
        "matchedText": "`/admin/shows/${showId}/cast/${personId}/roles`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/get-images/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/get-images/stream",
      "pathPattern": "/api/v1/admin/shows/[showId]/get-images/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/get-images/stream/route.ts",
      "sourceLocator": {
        "line": 47,
        "matchedText": "`/admin/shows/${showId}/get-images/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/google-news/sync",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/google-news/sync",
      "pathPattern": "/api/v1/admin/shows/[showId]/google-news/sync",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/google-news/sync/route.ts",
      "sourceLocator": {
        "line": 54,
        "matchedText": "`/admin/shows/${showId}/google-news/sync`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/import-bravo/commit",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/import-bravo/commit",
      "pathPattern": "/api/v1/admin/shows/[showId]/import-bravo/commit",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/import-bravo/commit/route.ts",
      "sourceLocator": {
        "line": 21,
        "matchedText": "`/admin/shows/${showId}/import-bravo/commit`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/import-bravo/preview",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/import-bravo/preview",
      "pathPattern": "/api/v1/admin/shows/[showId]/import-bravo/preview",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/import-bravo/preview/route.ts",
      "sourceLocator": {
        "line": 21,
        "matchedText": "`/admin/shows/${showId}/import-bravo/preview`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/import-bravo/preview/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/import-bravo/preview/stream",
      "pathPattern": "/api/v1/admin/shows/[showId]/import-bravo/preview/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream/route.ts",
      "sourceLocator": {
        "line": 195,
        "matchedText": "`/admin/shows/${showId}/import-bravo/preview/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/links",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/links",
      "pathPattern": "/api/v1/admin/shows/[showId]/links",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/route.ts",
      "sourceLocator": {
        "line": 47,
        "matchedText": "`/admin/shows/${showId}/links`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/links/add",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/links/add",
      "pathPattern": "/api/v1/admin/shows/[showId]/links/add",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/add/route.ts",
      "sourceLocator": {
        "line": 17,
        "matchedText": "`/admin/shows/${showId}/links/add`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/links/discover",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/links/discover",
      "pathPattern": "/api/v1/admin/shows/[showId]/links/discover",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/discover/route.ts",
      "sourceLocator": {
        "line": 25,
        "matchedText": "`/admin/shows/${showId}/links/discover`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/links/discover/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/links/discover/stream",
      "pathPattern": "/api/v1/admin/shows/[showId]/links/discover/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/discover/stream/route.ts",
      "sourceLocator": {
        "line": 268,
        "matchedText": "`/admin/shows/${showId}/links/discover/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/refresh",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/refresh",
      "pathPattern": "/api/v1/admin/shows/[showId]/refresh",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/refresh/route.ts",
      "sourceLocator": {
        "line": 42,
        "matchedText": "`/admin/shows/${showId}/refresh`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/refresh-photos/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/refresh-photos/stream",
      "pathPattern": "/api/v1/admin/shows/[showId]/refresh-photos/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/refresh-photos/stream/route.ts",
      "sourceLocator": {
        "line": 221,
        "matchedText": "`/admin/shows/${showId}/refresh-photos/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/refresh/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/refresh/stream",
      "pathPattern": "/api/v1/admin/shows/[showId]/refresh/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/refresh/stream/route.ts",
      "sourceLocator": {
        "line": 207,
        "matchedText": "`/admin/shows/${showId}/refresh/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/refresh/target/[target]/retry`,\n    );\n    if (!backendUrl) {\n      return NextResponse.json(\n        { error: \"Backend API not configured\" },\n        { status: 500 },\n      );\n    }\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) {\n      return NextResponse.json(\n        { error: \"Backend auth not configured\" },\n        { status: 500 },\n      );\n    }\n\n    let body: Record<string, unknown> = {};\n    if (request.headers.get(\"content-type",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/refresh/target/[target]/retry`,\n    );\n    if (!backendUrl) {\n      return NextResponse.json(\n        { error: \"Backend API not configured\" },\n        { status: 500 },\n      );\n    }\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) {\n      return NextResponse.json(\n        { error: \"Backend auth not configured\" },\n        { status: 500 },\n      );\n    }\n\n    let body: Record<string, unknown> = {};\n    if (request.headers.get(\"content-type",
      "pathPattern": "/api/v1/admin/shows/[showId]/refresh/target/[target]/retry`,\n    );\n    if (!backendUrl) {\n      return NextResponse.json(\n        { error: \"Backend API not configured\" },\n        { status: 500 },\n      );\n    }\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) {\n      return NextResponse.json(\n        { error: \"Backend auth not configured\" },\n        { status: 500 },\n      );\n    }\n\n    let body: Record<string, unknown> = {};\n    if (request.headers.get(\"content-type",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/refresh/target/[target]/retry/route.ts",
      "sourceLocator": {
        "line": 49,
        "matchedText": "`/admin/shows/${showId}/refresh/target/${target}/retry`,\n    );\n    if (!backendUrl) {\n      return NextResponse.json(\n        { error: \"Backend API not configured\" },\n        { status: 500 },\n      );\n    }\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) {\n      return NextResponse.json(\n        { error: \"Backend auth not configured\" },\n        { status: 500 },\n      );\n    }\n\n    let body: Record<string, unknown> = {};\n    if (request.headers.get(\"content-type\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/roles",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/roles",
      "pathPattern": "/api/v1/admin/shows/[showId]/roles",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/roles/route.ts",
      "sourceLocator": {
        "line": 218,
        "matchedText": "`/admin/shows/${showId}/roles`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
      "pathPattern": "/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream/route.ts",
      "sourceLocator": {
        "line": 199,
        "matchedText": "`/admin/shows/${showId}/seasons/${seasonNumber}/assets/batch-jobs/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
      "pathPattern": "/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit/route.ts",
      "sourceLocator": {
        "line": 24,
        "matchedText": "`/admin/shows/${showId}/seasons/${seasonNumber}/import-fandom/commit`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
      "pathPattern": "/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview/route.ts",
      "sourceLocator": {
        "line": 24,
        "matchedText": "`/admin/shows/${showId}/seasons/${seasonNumber}/import-fandom/preview`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/[showKey]/icons",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/[showKey]/icons",
      "pathPattern": "/api/v1/admin/shows/[showKey]/icons",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/shows/[showKey]/icons/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/shows/${encodeURIComponent(showKey)}/icons`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/logos/set-primary",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/logos/set-primary",
      "pathPattern": "/api/v1/admin/shows/logos/set-primary",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/logos/featured/route.ts",
      "sourceLocator": {
        "line": 91,
        "matchedText": "\"/admin/shows/logos/set-primary\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/networks-streaming/overrides",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/networks-streaming/overrides",
      "pathPattern": "/api/v1/admin/shows/networks-streaming/overrides",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/networks-streaming/overrides/route.ts",
      "sourceLocator": {
        "line": 106,
        "matchedText": "\"/admin/shows/networks-streaming/overrides\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/sync-from-lists",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/sync-from-lists",
      "pathPattern": "/api/v1/admin/shows/sync-from-lists",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/sync-from-lists/route.ts",
      "sourceLocator": {
        "line": 33,
        "matchedText": "\"/admin/shows/sync-from-lists\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:POST:/api/v1/admin/shows/sync-networks-streaming",
      "kind": "backend_endpoint",
      "title": "POST /api/v1/admin/shows/sync-networks-streaming",
      "pathPattern": "/api/v1/admin/shows/sync-networks-streaming",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/networks-streaming/sync/route.ts",
      "sourceLocator": {
        "line": 109,
        "matchedText": "\"/admin/shows/sync-networks-streaming\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:PUT:/api/v1/admin/brands/franchise-rules/[franchiseKey]",
      "kind": "backend_endpoint",
      "title": "PUT /api/v1/admin/brands/franchise-rules/[franchiseKey]",
      "pathPattern": "/api/v1/admin/brands/franchise-rules/[franchiseKey]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/route.ts",
      "sourceLocator": {
        "line": 25,
        "matchedText": "`/admin/brands/franchise-rules/${encodeURIComponent(franchiseKey)}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "backend:PUT:/api/v1/admin/social-posts/[postId]",
      "kind": "backend_endpoint",
      "title": "PUT /api/v1/admin/social-posts/[postId]",
      "pathPattern": "/api/v1/admin/social-posts/[postId]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/social-posts/[postId]/route.ts",
      "sourceLocator": {
        "line": 183,
        "matchedText": "`/admin/social-posts/${postId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "kind": "ui_surface",
      "title": "PersonProfilePage",
      "pathPattern": null,
      "symbol": "PersonProfilePage",
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "PersonProfilePage"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:request_originating_component"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": 1000,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "component:src/components/admin/AdminGlobalSearch.tsx::AdminGlobalSearch",
      "kind": "ui_surface",
      "title": "AdminGlobalSearch",
      "pathPattern": null,
      "symbol": "AdminGlobalSearch",
      "sourceFile": "src/components/admin/AdminGlobalSearch.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "AdminGlobalSearch"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:request_originating_component"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "component:src/components/admin/BravotvImageRunPanel.tsx::BravotvImageRunPanel",
      "kind": "ui_surface",
      "title": "BravotvImageRunPanel",
      "pathPattern": null,
      "symbol": "BravotvImageRunPanel",
      "sourceFile": "src/components/admin/BravotvImageRunPanel.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "BravotvImageRunPanel"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:request_originating_component"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "component:src/components/admin/design-system/BrandFontMatchesPanel.tsx::BrandFontMatchesPanel",
      "kind": "ui_surface",
      "title": "BrandFontMatchesPanel",
      "pathPattern": null,
      "symbol": "BrandFontMatchesPanel",
      "sourceFile": "src/components/admin/design-system/BrandFontMatchesPanel.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "BrandFontMatchesPanel"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:request_originating_component"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "component:src/components/admin/design-system/DesignSystemPageClient.tsx::DesignSystemPageClient",
      "kind": "ui_surface",
      "title": "DesignSystemPageClient",
      "pathPattern": null,
      "symbol": "DesignSystemPageClient",
      "sourceFile": "src/components/admin/design-system/DesignSystemPageClient.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "DesignSystemPageClient"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:request_originating_component"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "component:src/components/admin/GameProblemReports.tsx::GameProblemReports",
      "kind": "ui_surface",
      "title": "GameProblemReports",
      "pathPattern": null,
      "symbol": "GameProblemReports",
      "sourceFile": "src/components/admin/GameProblemReports.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "GameProblemReports"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:request_originating_component"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "component:src/components/admin/image-lightbox/ReplaceGettyDrawer.tsx::ReplaceGettyDrawer",
      "kind": "ui_surface",
      "title": "ReplaceGettyDrawer",
      "pathPattern": null,
      "symbol": "ReplaceGettyDrawer",
      "sourceFile": "src/components/admin/image-lightbox/ReplaceGettyDrawer.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "ReplaceGettyDrawer"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:request_originating_component"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "high"
    },
    {
      "id": "component:src/components/admin/ImageScrapeDrawer.tsx::ImageScrapeDrawer",
      "kind": "ui_surface",
      "title": "ImageScrapeDrawer",
      "pathPattern": null,
      "symbol": "ImageScrapeDrawer",
      "sourceFile": "src/components/admin/ImageScrapeDrawer.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "ImageScrapeDrawer"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:request_originating_component"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "component:src/components/admin/NbcumvSeasonBios.tsx::NbcumvSeasonBios",
      "kind": "ui_surface",
      "title": "NbcumvSeasonBios",
      "pathPattern": null,
      "symbol": "NbcumvSeasonBios",
      "sourceFile": "src/components/admin/NbcumvSeasonBios.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "NbcumvSeasonBios"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:request_originating_component"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "component:src/components/admin/PeopleSearchMultiSelect.tsx::PeopleSearchMultiSelect",
      "kind": "ui_surface",
      "title": "PeopleSearchMultiSelect",
      "pathPattern": null,
      "symbol": "PeopleSearchMultiSelect",
      "sourceFile": "src/components/admin/PeopleSearchMultiSelect.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "PeopleSearchMultiSelect"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:request_originating_component"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "component:src/components/admin/social-posts-section.tsx::SocialPostsSection",
      "kind": "ui_surface",
      "title": "SocialPostsSection",
      "pathPattern": null,
      "symbol": "SocialPostsSection",
      "sourceFile": "src/components/admin/social-posts-section.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "SocialPostsSection"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:request_originating_component"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "component:src/components/admin/social-week/WeekDetailPageView.tsx::WeekDetailPage",
      "kind": "ui_surface",
      "title": "WeekDetailPage",
      "pathPattern": null,
      "symbol": "WeekDetailPage",
      "sourceFile": "src/components/admin/social-week/WeekDetailPageView.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "WeekDetailPage"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:request_originating_component"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": 1000,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "page:/admin",
      "kind": "ui_surface",
      "title": "Admin",
      "pathPattern": "/admin",
      "symbol": "page",
      "sourceFile": "src/app/admin/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "manual_override",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "manual_override:admin_dashboard_reference_container",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/api-references",
      "kind": "ui_surface",
      "title": "Admin / Api References",
      "pathPattern": "/admin/api-references",
      "symbol": "page",
      "sourceFile": "src/app/admin/api-references/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "manual_override",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "manual_override:reference_library_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/brands",
      "kind": "ui_surface",
      "title": "Admin / Brands",
      "pathPattern": "/admin/brands",
      "symbol": "page",
      "sourceFile": "src/app/admin/brands/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/cast-screentime",
      "kind": "ui_surface",
      "title": "Admin / Cast Screentime",
      "pathPattern": "/admin/cast-screentime",
      "symbol": "page",
      "sourceFile": "src/app/admin/cast-screentime/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/design-docs/athletic-articles",
      "kind": "ui_surface",
      "title": "Admin / Design Docs / Athletic Articles",
      "pathPattern": "/admin/design-docs/athletic-articles",
      "symbol": "page",
      "sourceFile": "src/app/admin/design-docs/athletic-articles/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/dev-dashboard",
      "kind": "ui_surface",
      "title": "Admin / Dev Dashboard",
      "pathPattern": "/admin/dev-dashboard",
      "symbol": "page",
      "sourceFile": "src/app/admin/dev-dashboard/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "page:/admin/dev-dashboard/skills-and-agents",
      "kind": "ui_surface",
      "title": "Admin / Dev Dashboard / Skills And Agents",
      "pathPattern": "/admin/dev-dashboard/skills-and-agents",
      "symbol": "page",
      "sourceFile": "src/app/admin/dev-dashboard/skills-and-agents/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/docs",
      "kind": "ui_surface",
      "title": "Admin / Docs",
      "pathPattern": "/admin/docs",
      "symbol": "page",
      "sourceFile": "src/app/admin/docs/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "manual_override",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "manual_override:documentation_reference_surface",
        "derived:static_only_page"
      ],
      "usageTier": "low",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list"
      ],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/games",
      "kind": "ui_surface",
      "title": "Admin / Games",
      "pathPattern": "/admin/games",
      "symbol": "page",
      "sourceFile": "src/app/admin/games/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/games/bravodle",
      "kind": "ui_surface",
      "title": "Admin / Games / Bravodle",
      "pathPattern": "/admin/games/bravodle",
      "symbol": "page",
      "sourceFile": "src/app/admin/games/bravodle/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/games/flashback",
      "kind": "ui_surface",
      "title": "Admin / Games / Flashback",
      "pathPattern": "/admin/games/flashback",
      "symbol": "page",
      "sourceFile": "src/app/admin/games/flashback/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "page:/admin/games/realitease",
      "kind": "ui_surface",
      "title": "Admin / Games / Realitease",
      "pathPattern": "/admin/games/realitease",
      "symbol": "page",
      "sourceFile": "src/app/admin/games/realitease/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/groups",
      "kind": "ui_surface",
      "title": "Admin / Groups",
      "pathPattern": "/admin/groups",
      "symbol": "page",
      "sourceFile": "src/app/admin/groups/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list"
      ],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/networks-and-streaming/[entityType]/[entitySlug]",
      "kind": "ui_surface",
      "title": "Admin / Networks And Streaming / EntityType / EntitySlug",
      "pathPattern": "/admin/networks-and-streaming/[entityType]/[entitySlug]",
      "symbol": "page",
      "sourceFile": "src/app/admin/networks-and-streaming/[entityType]/[entitySlug]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/reddit-post-details",
      "kind": "ui_surface",
      "title": "Admin / Reddit Post Details",
      "pathPattern": "/admin/reddit-post-details",
      "symbol": "page",
      "sourceFile": "src/app/admin/reddit-post-details/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/reddit-window-posts",
      "kind": "ui_surface",
      "title": "Admin / Reddit Window Posts",
      "pathPattern": "/admin/reddit-window-posts",
      "symbol": "page",
      "sourceFile": "src/app/admin/reddit-window-posts/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "page:/admin/scrape-images",
      "kind": "ui_surface",
      "title": "Admin / Scrape Images",
      "pathPattern": "/admin/scrape-images",
      "symbol": "page",
      "sourceFile": "src/app/admin/scrape-images/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/settings",
      "kind": "ui_surface",
      "title": "Admin / Settings",
      "pathPattern": "/admin/settings",
      "symbol": "page",
      "sourceFile": "src/app/admin/settings/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/shows",
      "kind": "ui_surface",
      "title": "Admin / Shows",
      "pathPattern": "/admin/shows",
      "symbol": "page",
      "sourceFile": "src/app/admin/shows/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/shows/settings",
      "kind": "ui_surface",
      "title": "Admin / Shows / Settings",
      "pathPattern": "/admin/shows/settings",
      "symbol": "page",
      "sourceFile": "src/app/admin/shows/settings/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social",
      "kind": "ui_surface",
      "title": "Admin / Social",
      "pathPattern": "/admin/social",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social/bravo-content",
      "kind": "ui_surface",
      "title": "Admin / Social / Bravo Content",
      "pathPattern": "/admin/social/bravo-content",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/bravo-content/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social/creator-content",
      "kind": "ui_surface",
      "title": "Admin / Social / Creator Content",
      "pathPattern": "/admin/social/creator-content",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/creator-content/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social/reddit",
      "kind": "ui_surface",
      "title": "Admin / Social / Reddit",
      "pathPattern": "/admin/social/reddit",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/reddit/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social/reddit/[communitySlug]",
      "kind": "ui_surface",
      "title": "Admin / Social / Reddit / CommunitySlug",
      "pathPattern": "/admin/social/reddit/[communitySlug]",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/reddit/[communitySlug]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social/reddit/[communitySlug]/[showSlug]",
      "kind": "ui_surface",
      "title": "Admin / Social / Reddit / CommunitySlug / ShowSlug",
      "pathPattern": "/admin/social/reddit/[communitySlug]/[showSlug]",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/reddit/[communitySlug]/[showSlug]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social/reddit/[communitySlug]/[showSlug]/[windowKey]",
      "kind": "ui_surface",
      "title": "Admin / Social / Reddit / CommunitySlug / ShowSlug / WindowKey",
      "pathPattern": "/admin/social/reddit/[communitySlug]/[showSlug]/[windowKey]",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/reddit/[communitySlug]/[showSlug]/[windowKey]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social/reddit/[communitySlug]/[showSlug]/[windowKey]/[detailSlug]",
      "kind": "ui_surface",
      "title": "Admin / Social / Reddit / CommunitySlug / ShowSlug / WindowKey / DetailSlug",
      "pathPattern": "/admin/social/reddit/[communitySlug]/[showSlug]/[windowKey]/[detailSlug]",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/reddit/[communitySlug]/[showSlug]/[windowKey]/[detailSlug]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social/reddit/[communitySlug]/[showSlug]/[windowKey]/post/[postId]",
      "kind": "ui_surface",
      "title": "Admin / Social / Reddit / CommunitySlug / ShowSlug / WindowKey / Post / PostId",
      "pathPattern": "/admin/social/reddit/[communitySlug]/[showSlug]/[windowKey]/post/[postId]",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/reddit/[communitySlug]/[showSlug]/[windowKey]/post/[postId]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]",
      "kind": "ui_surface",
      "title": "Admin / Social / Reddit / CommunitySlug / ShowSlug / S[seasonNumber]",
      "pathPattern": "/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]",
      "kind": "ui_surface",
      "title": "Admin / Social / Reddit / CommunitySlug / ShowSlug / S[seasonNumber] / WindowKey",
      "pathPattern": "/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/[detailSlug]",
      "kind": "ui_surface",
      "title": "Admin / Social / Reddit / CommunitySlug / ShowSlug / S[seasonNumber] / WindowKey / DetailSlug",
      "pathPattern": "/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/[detailSlug]",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/[detailSlug]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/post/[postId]",
      "kind": "ui_surface",
      "title": "Admin / Social / Reddit / CommunitySlug / ShowSlug / S[seasonNumber] / WindowKey / Post / PostId",
      "pathPattern": "/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/post/[postId]",
      "symbol": "page",
      "sourceFile": "src/app/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/post/[postId]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/survey-responses",
      "kind": "ui_surface",
      "title": "Admin / Survey Responses",
      "pathPattern": "/admin/survey-responses",
      "symbol": "page",
      "sourceFile": "src/app/admin/survey-responses/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "page:/admin/surveys",
      "kind": "ui_surface",
      "title": "Admin / Surveys",
      "pathPattern": "/admin/surveys",
      "symbol": "page",
      "sourceFile": "src/app/admin/surveys/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/surveys/[surveyKey]",
      "kind": "ui_surface",
      "title": "Admin / Surveys / SurveyKey",
      "pathPattern": "/admin/surveys/[surveyKey]",
      "symbol": "page",
      "sourceFile": "src/app/admin/surveys/[surveyKey]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/surveys/normalized",
      "kind": "ui_surface",
      "title": "Admin / Surveys / Normalized",
      "pathPattern": "/admin/surveys/normalized",
      "symbol": "page",
      "sourceFile": "src/app/admin/surveys/normalized/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/surveys/normalized/[surveySlug]",
      "kind": "ui_surface",
      "title": "Admin / Surveys / Normalized / SurveySlug",
      "pathPattern": "/admin/surveys/normalized/[surveySlug]",
      "symbol": "page",
      "sourceFile": "src/app/admin/surveys/normalized/[surveySlug]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/trr-shows",
      "kind": "ui_surface",
      "title": "Admin / Trr Shows",
      "pathPattern": "/admin/trr-shows",
      "symbol": "page",
      "sourceFile": "src/app/admin/trr-shows/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/trr-shows/[showId]",
      "kind": "ui_surface",
      "title": "Admin / Trr Shows / ShowId",
      "pathPattern": "/admin/trr-shows/[showId]",
      "symbol": "page",
      "sourceFile": "src/app/admin/trr-shows/[showId]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "page:/admin/trr-shows/[showId]/people/[personId]/[[...personTab]]",
      "kind": "ui_surface",
      "title": "Admin / Trr Shows / ShowId / People / PersonId / [...personTab]",
      "pathPattern": "/admin/trr-shows/[showId]/people/[personId]/[[...personTab]]",
      "symbol": "page",
      "sourceFile": "src/app/admin/trr-shows/[showId]/people/[personId]/[[...personTab]]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "kind": "ui_surface",
      "title": "Admin / Trr Shows / ShowId / Seasons / SeasonNumber",
      "pathPattern": "/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "symbol": "page",
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "indirect",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]",
      "kind": "ui_surface",
      "title": "Admin / Trr Shows / ShowId / Seasons / SeasonNumber / Social / Week / WeekIndex",
      "pathPattern": "/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]",
      "symbol": "page",
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/[platform]",
      "kind": "ui_surface",
      "title": "Admin / Trr Shows / ShowId / Seasons / SeasonNumber / Social / Week / WeekIndex / Platform",
      "pathPattern": "/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/[platform]",
      "symbol": "page",
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/[platform]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/trr-shows/people/[personId]/[[...personTab]]",
      "kind": "ui_surface",
      "title": "Admin / Trr Shows / People / PersonId / [...personTab]",
      "pathPattern": "/admin/trr-shows/people/[personId]/[[...personTab]]",
      "symbol": "page",
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/[[...personTab]]/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": true,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "page:/admin/users",
      "kind": "ui_surface",
      "title": "Admin / Users",
      "pathPattern": "/admin/users",
      "symbol": "page",
      "sourceFile": "src/app/admin/users/page.tsx",
      "sourceLocator": {
        "line": 1,
        "symbol": "page"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:admin_page",
        "derived:static_only_page"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list"
      ],
      "staticOnly": true,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "poll:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::set-interval-1",
      "kind": "polling_loop",
      "title": "PersonProfilePage set-interval",
      "pathPattern": null,
      "symbol": "set-interval",
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 1410,
        "matchedText": "setInterval"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:setInterval"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": 1000,
      "automatic": true,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "high"
    },
    {
      "id": "poll:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::set-interval-2",
      "kind": "polling_loop",
      "title": "PersonProfilePage set-interval",
      "pathPattern": null,
      "symbol": "set-interval",
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 7767,
        "matchedText": "setInterval"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:setInterval"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "high"
    },
    {
      "id": "poll:src/components/admin/social-week/WeekDetailPageView.tsx::set-interval-1",
      "kind": "polling_loop",
      "title": "WeekDetailPage set-interval",
      "pathPattern": null,
      "symbol": "set-interval",
      "sourceFile": "src/components/admin/social-week/WeekDetailPageView.tsx",
      "sourceLocator": {
        "line": 7151,
        "matchedText": "setInterval"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:setInterval"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": 1000,
      "automatic": true,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "high"
    },
    {
      "id": "poll:src/components/admin/social-week/WeekDetailPageView.tsx::set-interval-2",
      "kind": "polling_loop",
      "title": "WeekDetailPage set-interval",
      "pathPattern": null,
      "symbol": "set-interval",
      "sourceFile": "src/components/admin/social-week/WeekDetailPageView.tsx",
      "sourceLocator": {
        "line": 7159,
        "matchedText": "setInterval"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:setInterval"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "indirect",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "high"
    },
    {
      "id": "repo:src/lib/server/admin/brand-profile-repository.ts::module",
      "kind": "repository_surface",
      "title": "brand-profile-repository module",
      "pathPattern": null,
      "symbol": "module",
      "sourceFile": "src/lib/server/admin/brand-profile-repository.ts",
      "sourceLocator": {
        "line": 1,
        "symbol": "module"
      },
      "provenance": "manual_override",
      "confidence": "medium",
      "verificationStatus": "unverified_manual",
      "basis": [
        "manual_override:backend_repository_mapping_seed"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "direct",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "repo:src/lib/server/admin/networks-streaming-repository.ts::module",
      "kind": "repository_surface",
      "title": "networks-streaming-repository module",
      "pathPattern": null,
      "symbol": "module",
      "sourceFile": "src/lib/server/admin/networks-streaming-repository.ts",
      "sourceLocator": {
        "line": 1,
        "symbol": "module"
      },
      "provenance": "manual_override",
      "confidence": "medium",
      "verificationStatus": "unverified_manual",
      "basis": [
        "manual_override:backend_repository_mapping_seed"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "direct",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/covered-shows/[showId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/covered-shows/[showId]",
      "pathPattern": "/api/admin/covered-shows/[showId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/covered-shows/[showId]/route.ts",
      "sourceLocator": {
        "line": 134,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/design-system/typography/sets/[setId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/design-system/typography/sets/[setId]",
      "pathPattern": "/api/admin/design-system/typography/sets/[setId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/design-system/typography/sets/[setId]/route.ts",
      "sourceLocator": {
        "line": 60,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/flashback/events/[eventId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/flashback/events/[eventId]",
      "pathPattern": "/api/admin/flashback/events/[eventId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/flashback/events/[eventId]/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/images/[imageType]/[imageId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/images/[imageType]/[imageId]",
      "pathPattern": "/api/admin/images/[imageType]/[imageId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/images/[imageType]/[imageId]/route.ts",
      "sourceLocator": {
        "line": 56,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/networks-streaming/overrides/[id]",
      "kind": "api_route",
      "title": "DELETE /api/admin/networks-streaming/overrides/[id]",
      "pathPattern": "/api/admin/networks-streaming/overrides/[id]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/networks-streaming/overrides/[id]/route.ts",
      "sourceLocator": {
        "line": 106,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:DELETE:/api/admin/normalized-surveys/[surveySlug]",
      "kind": "api_route",
      "title": "DELETE /api/admin/normalized-surveys/[surveySlug]",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/route.ts",
      "sourceLocator": {
        "line": 78,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/normalized-surveys/[surveySlug]/questions/[questionId]",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/route.ts",
      "sourceLocator": {
        "line": 77,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
      "kind": "api_route",
      "title": "DELETE /api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options/route.ts",
      "sourceLocator": {
        "line": 125,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/normalized-surveys/[surveySlug]/runs/[runId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/normalized-surveys/[surveySlug]/runs/[runId]",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/runs/[runId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/route.ts",
      "sourceLocator": {
        "line": 77,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/reddit/communities/[communityId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/reddit/communities/[communityId]",
      "pathPattern": "/api/admin/reddit/communities/[communityId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/route.ts",
      "sourceLocator": {
        "line": 317,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/reddit/threads/[threadId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/reddit/threads/[threadId]",
      "pathPattern": "/api/admin/reddit/threads/[threadId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/reddit/threads/[threadId]/route.ts",
      "sourceLocator": {
        "line": 240,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/shows/[showKey]",
      "kind": "api_route",
      "title": "DELETE /api/admin/shows/[showKey]",
      "pathPattern": "/api/admin/shows/[showKey]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/shows/[showKey]/route.ts",
      "sourceLocator": {
        "line": 105,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/shows/[showKey]/icons/[iconId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/shows/[showKey]/icons/[iconId]",
      "pathPattern": "/api/admin/shows/[showKey]/icons/[iconId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/shows/[showKey]/icons/[iconId]/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/shows/[showKey]/seasons/[seasonId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/shows/[showKey]/seasons/[seasonId]",
      "pathPattern": "/api/admin/shows/[showKey]/seasons/[seasonId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/shows/[showKey]/seasons/[seasonId]/route.ts",
      "sourceLocator": {
        "line": 119,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/shows/palette-library/[paletteId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/shows/palette-library/[paletteId]",
      "pathPattern": "/api/admin/shows/palette-library/[paletteId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/shows/palette-library/[paletteId]/route.ts",
      "sourceLocator": {
        "line": 9,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/social-posts/[postId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/social-posts/[postId]",
      "pathPattern": "/api/admin/social-posts/[postId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/social-posts/[postId]/route.ts",
      "sourceLocator": {
        "line": 171,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:DELETE:/api/admin/surveys/[surveyKey]",
      "kind": "api_route",
      "title": "DELETE /api/admin/surveys/[surveyKey]",
      "pathPattern": "/api/admin/surveys/[surveyKey]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/route.ts",
      "sourceLocator": {
        "line": 374,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:DELETE:/api/admin/surveys/[surveyKey]/cast/[castId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/surveys/[surveyKey]/cast/[castId]",
      "pathPattern": "/api/admin/surveys/[surveyKey]/cast/[castId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/cast/[castId]/route.ts",
      "sourceLocator": {
        "line": 99,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/surveys/[surveyKey]/episodes/[episodeId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/surveys/[surveyKey]/episodes/[episodeId]",
      "pathPattern": "/api/admin/surveys/[surveyKey]/episodes/[episodeId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/episodes/[episodeId]/route.ts",
      "sourceLocator": {
        "line": 95,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/trr-api/brands/families/[familyId]/members/[memberId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/trr-api/brands/families/[familyId]/members/[memberId]",
      "pathPattern": "/api/admin/trr-api/brands/families/[familyId]/members/[memberId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/members/[memberId]/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/trr-api/brands/logos/options/saved/[assetId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/trr-api/brands/logos/options/saved/[assetId]",
      "pathPattern": "/api/admin/trr-api/brands/logos/options/saved/[assetId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/saved/[assetId]/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/trr-api/media-assets/[assetId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/trr-api/media-assets/[assetId]",
      "pathPattern": "/api/admin/trr-api/media-assets/[assetId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/route.ts",
      "sourceLocator": {
        "line": 17,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/trr-api/people/[personId]/cover-photo",
      "kind": "api_route",
      "title": "DELETE /api/admin/trr-api/people/[personId]/cover-photo",
      "pathPattern": "/api/admin/trr-api/people/[personId]/cover-photo",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/cover-photo/route.ts",
      "sourceLocator": {
        "line": 171,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:DELETE:/api/admin/trr-api/shows/[showId]/links/[linkId]",
      "kind": "api_route",
      "title": "DELETE /api/admin/trr-api/shows/[showId]/links/[linkId]",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/links/[linkId]",
      "symbol": "DELETE",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/[linkId]/route.ts",
      "sourceLocator": {
        "line": 58,
        "symbol": "DELETE"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/assets/deadline-gallery",
      "kind": "api_route",
      "title": "GET /api/admin/assets/deadline-gallery",
      "pathPattern": "/api/admin/assets/deadline-gallery",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/assets/deadline-gallery/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/auth/status",
      "kind": "api_route",
      "title": "GET /api/admin/auth/status",
      "pathPattern": "/api/admin/auth/status",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/auth/status/route.ts",
      "sourceLocator": {
        "line": 8,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/auth/status/drill-report",
      "kind": "api_route",
      "title": "GET /api/admin/auth/status/drill-report",
      "pathPattern": "/api/admin/auth/status/drill-report",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/auth/status/drill-report/route.ts",
      "sourceLocator": {
        "line": 8,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/brands/profile",
      "kind": "api_route",
      "title": "GET /api/admin/brands/profile",
      "pathPattern": "/api/admin/brands/profile",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/brands/profile/route.ts",
      "sourceLocator": {
        "line": 18,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/colors/image-proxy",
      "kind": "api_route",
      "title": "GET /api/admin/colors/image-proxy",
      "pathPattern": "/api/admin/colors/image-proxy",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/colors/image-proxy/route.ts",
      "sourceLocator": {
        "line": 32,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/covered-shows",
      "kind": "api_route",
      "title": "GET /api/admin/covered-shows",
      "pathPattern": "/api/admin/covered-shows",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/covered-shows/route.ts",
      "sourceLocator": {
        "line": 57,
        "symbol": "GET"
      },
      "provenance": "manual_override",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "manual_override:frequent_admin_list_fetch"
      ],
      "usageTier": "medium",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/covered-shows/[showId]",
      "kind": "api_route",
      "title": "GET /api/admin/covered-shows/[showId]",
      "pathPattern": "/api/admin/covered-shows/[showId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/covered-shows/[showId]/route.ts",
      "sourceLocator": {
        "line": 74,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/design-system/brand-font-matches",
      "kind": "api_route",
      "title": "GET /api/admin/design-system/brand-font-matches",
      "pathPattern": "/api/admin/design-system/brand-font-matches",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/design-system/brand-font-matches/route.ts",
      "sourceLocator": {
        "line": 29,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/design-system/nyt-occurrences",
      "kind": "api_route",
      "title": "GET /api/admin/design-system/nyt-occurrences",
      "pathPattern": "/api/admin/design-system/nyt-occurrences",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/design-system/nyt-occurrences/route.ts",
      "sourceLocator": {
        "line": 142,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/design-system/typography",
      "kind": "api_route",
      "title": "GET /api/admin/design-system/typography",
      "pathPattern": "/api/admin/design-system/typography",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/design-system/typography/route.ts",
      "sourceLocator": {
        "line": 17,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/dev-dashboard",
      "kind": "api_route",
      "title": "GET /api/admin/dev-dashboard",
      "pathPattern": "/api/admin/dev-dashboard",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/dev-dashboard/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/dev-dashboard/skills-and-agents",
      "kind": "api_route",
      "title": "GET /api/admin/dev-dashboard/skills-and-agents",
      "pathPattern": "/api/admin/dev-dashboard/skills-and-agents",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/dev-dashboard/skills-and-agents/route.ts",
      "sourceLocator": {
        "line": 7,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/flashback/quizzes",
      "kind": "api_route",
      "title": "GET /api/admin/flashback/quizzes",
      "pathPattern": "/api/admin/flashback/quizzes",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/flashback/quizzes/route.ts",
      "sourceLocator": {
        "line": 11,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/flashback/quizzes/[quizId]/events",
      "kind": "api_route",
      "title": "GET /api/admin/flashback/quizzes/[quizId]/events",
      "pathPattern": "/api/admin/flashback/quizzes/[quizId]/events",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/flashback/quizzes/[quizId]/events/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/games/problem-reports",
      "kind": "api_route",
      "title": "GET /api/admin/games/problem-reports",
      "pathPattern": "/api/admin/games/problem-reports",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/games/problem-reports/route.ts",
      "sourceLocator": {
        "line": 43,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/getty-local/scrape",
      "kind": "api_route",
      "title": "GET /api/admin/getty-local/scrape",
      "pathPattern": "/api/admin/getty-local/scrape",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/getty-local/scrape/route.ts",
      "sourceLocator": {
        "line": 25,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/images/[imageType]/[imageId]",
      "kind": "api_route",
      "title": "GET /api/admin/images/[imageType]/[imageId]",
      "pathPattern": "/api/admin/images/[imageType]/[imageId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/images/[imageType]/[imageId]/route.ts",
      "sourceLocator": {
        "line": 22,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/nbcumv/talent-bios",
      "kind": "api_route",
      "title": "GET /api/admin/nbcumv/talent-bios",
      "pathPattern": "/api/admin/nbcumv/talent-bios",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/nbcumv/talent-bios/route.ts",
      "sourceLocator": {
        "line": 149,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/networks-streaming/detail",
      "kind": "api_route",
      "title": "GET /api/admin/networks-streaming/detail",
      "pathPattern": "/api/admin/networks-streaming/detail",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/networks-streaming/detail/route.ts",
      "sourceLocator": {
        "line": 25,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/networks-streaming/overrides",
      "kind": "api_route",
      "title": "GET /api/admin/networks-streaming/overrides",
      "pathPattern": "/api/admin/networks-streaming/overrides",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/networks-streaming/overrides/route.ts",
      "sourceLocator": {
        "line": 51,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/networks-streaming/summary",
      "kind": "api_route",
      "title": "GET /api/admin/networks-streaming/summary",
      "pathPattern": "/api/admin/networks-streaming/summary",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/networks-streaming/summary/route.ts",
      "sourceLocator": {
        "line": 26,
        "symbol": "GET"
      },
      "provenance": "manual_override",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "manual_override:brand_summary_dashboard"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/normalized-surveys",
      "kind": "api_route",
      "title": "GET /api/admin/normalized-surveys",
      "pathPattern": "/api/admin/normalized-surveys",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/normalized-surveys/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/normalized-surveys/[surveySlug]",
      "kind": "api_route",
      "title": "GET /api/admin/normalized-surveys/[surveySlug]",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/normalized-surveys/[surveySlug]/questions",
      "kind": "api_route",
      "title": "GET /api/admin/normalized-surveys/[surveySlug]/questions",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/questions",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/questions/route.ts",
      "sourceLocator": {
        "line": 13,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]",
      "kind": "api_route",
      "title": "GET /api/admin/normalized-surveys/[surveySlug]/questions/[questionId]",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
      "kind": "api_route",
      "title": "GET /api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options/route.ts",
      "sourceLocator": {
        "line": 17,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/normalized-surveys/[surveySlug]/runs",
      "kind": "api_route",
      "title": "GET /api/admin/normalized-surveys/[surveySlug]/runs",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/runs",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/runs/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/normalized-surveys/[surveySlug]/runs/[runId]",
      "kind": "api_route",
      "title": "GET /api/admin/normalized-surveys/[surveySlug]/runs/[runId]",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/runs/[runId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/export",
      "kind": "api_route",
      "title": "GET /api/admin/normalized-surveys/[surveySlug]/runs/[runId]/export",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/export",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/export/route.ts",
      "sourceLocator": {
        "line": 24,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/responses",
      "kind": "api_route",
      "title": "GET /api/admin/normalized-surveys/[surveySlug]/runs/[runId]/responses",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/responses",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/responses/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/recent-people",
      "kind": "api_route",
      "title": "GET /api/admin/recent-people",
      "pathPattern": "/api/admin/recent-people",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/recent-people/route.ts",
      "sourceLocator": {
        "line": 34,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/analytics/community/[communityId]/posts",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/analytics/community/[communityId]/posts",
      "pathPattern": "/api/admin/reddit/analytics/community/[communityId]/posts",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/analytics/community/[communityId]/posts/route.ts",
      "sourceLocator": {
        "line": 22,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/analytics/community/[communityId]/summary",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/analytics/community/[communityId]/summary",
      "pathPattern": "/api/admin/reddit/analytics/community/[communityId]/summary",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/analytics/community/[communityId]/summary/route.ts",
      "sourceLocator": {
        "line": 22,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/communities",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/communities",
      "pathPattern": "/api/admin/reddit/communities",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/communities/route.ts",
      "sourceLocator": {
        "line": 45,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/communities/[communityId]",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/communities/[communityId]",
      "pathPattern": "/api/admin/reddit/communities/[communityId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/route.ts",
      "sourceLocator": {
        "line": 29,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/communities/[communityId]/backfill/snapshot",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/communities/[communityId]/backfill/snapshot",
      "pathPattern": "/api/admin/reddit/communities/[communityId]/backfill/snapshot",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/backfill/snapshot/route.ts",
      "sourceLocator": {
        "line": 25,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/communities/[communityId]/discover",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/communities/[communityId]/discover",
      "pathPattern": "/api/admin/reddit/communities/[communityId]/discover",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/discover/route.ts",
      "sourceLocator": {
        "line": 809,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/reddit/communities/[communityId]/episode-discussions/refresh",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/communities/[communityId]/episode-discussions/refresh",
      "pathPattern": "/api/admin/reddit/communities/[communityId]/episode-discussions/refresh",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/episode-discussions/refresh/route.ts",
      "sourceLocator": {
        "line": 298,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/communities/[communityId]/posts/[postId]/details",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/communities/[communityId]/posts/[postId]/details",
      "pathPattern": "/api/admin/reddit/communities/[communityId]/posts/[postId]/details",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/posts/[postId]/details/route.ts",
      "sourceLocator": {
        "line": 23,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/communities/[communityId]/posts/resolve",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/communities/[communityId]/posts/resolve",
      "pathPattern": "/api/admin/reddit/communities/[communityId]/posts/resolve",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/posts/resolve/route.ts",
      "sourceLocator": {
        "line": 40,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/communities/[communityId]/stored-post-counts",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/communities/[communityId]/stored-post-counts",
      "pathPattern": "/api/admin/reddit/communities/[communityId]/stored-post-counts",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/stored-post-counts/route.ts",
      "sourceLocator": {
        "line": 25,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/reddit/communities/[communityId]/stored-posts",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/communities/[communityId]/stored-posts",
      "pathPattern": "/api/admin/reddit/communities/[communityId]/stored-posts",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/stored-posts/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/runs",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/runs",
      "pathPattern": "/api/admin/reddit/runs",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/runs/route.ts",
      "sourceLocator": {
        "line": 18,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/runs/[runId]",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/runs/[runId]",
      "pathPattern": "/api/admin/reddit/runs/[runId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/runs/[runId]/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/threads",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/threads",
      "pathPattern": "/api/admin/reddit/threads",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/threads/route.ts",
      "sourceLocator": {
        "line": 56,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/reddit/threads/[threadId]",
      "kind": "api_route",
      "title": "GET /api/admin/reddit/threads/[threadId]",
      "pathPattern": "/api/admin/reddit/threads/[threadId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/reddit/threads/[threadId]/route.ts",
      "sourceLocator": {
        "line": 51,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/shows",
      "kind": "api_route",
      "title": "GET /api/admin/shows",
      "pathPattern": "/api/admin/shows",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/shows/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/shows/[showKey]",
      "kind": "api_route",
      "title": "GET /api/admin/shows/[showKey]",
      "pathPattern": "/api/admin/shows/[showKey]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/shows/[showKey]/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/shows/[showKey]/icons",
      "kind": "api_route",
      "title": "GET /api/admin/shows/[showKey]/icons",
      "pathPattern": "/api/admin/shows/[showKey]/icons",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/shows/[showKey]/icons/route.ts",
      "sourceLocator": {
        "line": 23,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/shows/[showKey]/seasons",
      "kind": "api_route",
      "title": "GET /api/admin/shows/[showKey]/seasons",
      "pathPattern": "/api/admin/shows/[showKey]/seasons",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/shows/[showKey]/seasons/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/shows/[showKey]/seasons/[seasonId]",
      "kind": "api_route",
      "title": "GET /api/admin/shows/[showKey]/seasons/[seasonId]",
      "pathPattern": "/api/admin/shows/[showKey]/seasons/[seasonId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/shows/[showKey]/seasons/[seasonId]/route.ts",
      "sourceLocator": {
        "line": 20,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/shows/by-trr-show/[trrShowId]",
      "kind": "api_route",
      "title": "GET /api/admin/shows/by-trr-show/[trrShowId]",
      "pathPattern": "/api/admin/shows/by-trr-show/[trrShowId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/shows/by-trr-show/[trrShowId]/route.ts",
      "sourceLocator": {
        "line": 18,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/shows/palette-library",
      "kind": "api_route",
      "title": "GET /api/admin/shows/palette-library",
      "pathPattern": "/api/admin/shows/palette-library",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/shows/palette-library/route.ts",
      "sourceLocator": {
        "line": 73,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/social-posts/[postId]",
      "kind": "api_route",
      "title": "GET /api/admin/social-posts/[postId]",
      "pathPattern": "/api/admin/social-posts/[postId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/social-posts/[postId]/route.ts",
      "sourceLocator": {
        "line": 43,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/social/landing",
      "kind": "api_route",
      "title": "GET /api/admin/social/landing",
      "pathPattern": "/api/admin/social/landing",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/social/landing/route.ts",
      "sourceLocator": {
        "line": 7,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/surveys",
      "kind": "api_route",
      "title": "GET /api/admin/surveys",
      "pathPattern": "/api/admin/surveys",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/surveys/route.ts",
      "sourceLocator": {
        "line": 36,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/surveys/[surveyKey]",
      "kind": "api_route",
      "title": "GET /api/admin/surveys/[surveyKey]",
      "pathPattern": "/api/admin/surveys/[surveyKey]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/route.ts",
      "sourceLocator": {
        "line": 93,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/surveys/[surveyKey]/cast",
      "kind": "api_route",
      "title": "GET /api/admin/surveys/[surveyKey]/cast",
      "pathPattern": "/api/admin/surveys/[surveyKey]/cast",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/cast/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/surveys/[surveyKey]/cast/[castId]",
      "kind": "api_route",
      "title": "GET /api/admin/surveys/[surveyKey]/cast/[castId]",
      "pathPattern": "/api/admin/surveys/[surveyKey]/cast/[castId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/cast/[castId]/route.ts",
      "sourceLocator": {
        "line": 18,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/surveys/[surveyKey]/episodes",
      "kind": "api_route",
      "title": "GET /api/admin/surveys/[surveyKey]/episodes",
      "pathPattern": "/api/admin/surveys/[surveyKey]/episodes",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/episodes/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/surveys/[surveyKey]/episodes/[episodeId]",
      "kind": "api_route",
      "title": "GET /api/admin/surveys/[surveyKey]/episodes/[episodeId]",
      "pathPattern": "/api/admin/surveys/[surveyKey]/episodes/[episodeId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/episodes/[episodeId]/route.ts",
      "sourceLocator": {
        "line": 18,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/surveys/[surveyKey]/export",
      "kind": "api_route",
      "title": "GET /api/admin/surveys/[surveyKey]/export",
      "pathPattern": "/api/admin/surveys/[surveyKey]/export",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/export/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "manual_override",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "manual_override:user_triggered_export_blob"
      ],
      "usageTier": "low",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/surveys/[surveyKey]/responses",
      "kind": "api_route",
      "title": "GET /api/admin/surveys/[surveyKey]/responses",
      "pathPattern": "/api/admin/surveys/[surveyKey]/responses",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/responses/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "manual_override",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "manual_override:survey_response_table"
      ],
      "usageTier": "medium",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/surveys/[surveyKey]/responses/[responseId]",
      "kind": "api_route",
      "title": "GET /api/admin/surveys/[surveyKey]/responses/[responseId]",
      "pathPattern": "/api/admin/surveys/[surveyKey]/responses/[responseId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/responses/[responseId]/route.ts",
      "sourceLocator": {
        "line": 6,
        "symbol": "GET"
      },
      "provenance": "manual_override",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "manual_override:survey_response_detail"
      ],
      "usageTier": "medium",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/surveys/[surveyKey]/theme",
      "kind": "api_route",
      "title": "GET /api/admin/surveys/[surveyKey]/theme",
      "pathPattern": "/api/admin/surveys/[surveyKey]/theme",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/theme/route.ts",
      "sourceLocator": {
        "line": 18,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/families",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/families",
      "pathPattern": "/api/admin/trr-api/brands/families",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/families/[familyId]/links",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/families/[familyId]/links",
      "pathPattern": "/api/admin/trr-api/brands/families/[familyId]/links",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/links/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/families/[familyId]/wikipedia-show-urls",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/families/[familyId]/wikipedia-show-urls",
      "pathPattern": "/api/admin/trr-api/brands/families/[familyId]/wikipedia-show-urls",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/wikipedia-show-urls/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/families/by-entity",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/families/by-entity",
      "pathPattern": "/api/admin/trr-api/brands/families/by-entity",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/by-entity/route.ts",
      "sourceLocator": {
        "line": 8,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/families/suggestions",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/families/suggestions",
      "pathPattern": "/api/admin/trr-api/brands/families/suggestions",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/suggestions/route.ts",
      "sourceLocator": {
        "line": 8,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/franchise-rules",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/franchise-rules",
      "pathPattern": "/api/admin/trr-api/brands/franchise-rules",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/franchise-rules/route.ts",
      "sourceLocator": {
        "line": 13,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/logo-targets",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/logo-targets",
      "pathPattern": "/api/admin/trr-api/brands/logo-targets",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/logo-targets/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/logos",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/logos",
      "pathPattern": "/api/admin/trr-api/brands/logos",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/route.ts",
      "sourceLocator": {
        "line": 26,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/logos/options/modal",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/logos/options/modal",
      "pathPattern": "/api/admin/trr-api/brands/logos/options/modal",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/modal/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/logos/options/preview",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/logos/options/preview",
      "pathPattern": "/api/admin/trr-api/brands/logos/options/preview",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/preview/route.ts",
      "sourceLocator": {
        "line": 32,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/logos/options/source-suggestions",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/logos/options/source-suggestions",
      "pathPattern": "/api/admin/trr-api/brands/logos/options/source-suggestions",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/source-suggestions/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/logos/options/sources",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/logos/options/sources",
      "pathPattern": "/api/admin/trr-api/brands/logos/options/sources",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/sources/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/brands/shows-franchises",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/brands/shows-franchises",
      "pathPattern": "/api/admin/trr-api/brands/shows-franchises",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/brands/shows-franchises/route.ts",
      "sourceLocator": {
        "line": 27,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/bravotv/images/people/[personId]/latest",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/bravotv/images/people/[personId]/latest",
      "pathPattern": "/api/admin/trr-api/bravotv/images/people/[personId]/latest",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/people/[personId]/latest/route.ts",
      "sourceLocator": {
        "line": 10,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/bravotv/images/runs/[runId]/artifacts/[...artifactName]",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/bravotv/images/runs/[runId]/artifacts/[...artifactName]",
      "pathPattern": "/api/admin/trr-api/bravotv/images/runs/[runId]/artifacts/[...artifactName]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/runs/[runId]/artifacts/[...artifactName]/route.ts",
      "sourceLocator": {
        "line": 10,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/bravotv/images/shows/[showId]/latest",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/bravotv/images/shows/[showId]/latest",
      "pathPattern": "/api/admin/trr-api/bravotv/images/shows/[showId]/latest",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/shows/[showId]/latest/route.ts",
      "sourceLocator": {
        "line": 10,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/cast-screentime/[...path]",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/cast-screentime/[...path]",
      "pathPattern": "/api/admin/trr-api/cast-screentime/[...path]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/cast-screentime/[...path]/route.ts",
      "sourceLocator": {
        "line": 65,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/media-links",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/media-links",
      "pathPattern": "/api/admin/trr-api/media-links",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/media-links/route.ts",
      "sourceLocator": {
        "line": 90,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/operations/[operationId]",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/operations/[operationId]",
      "pathPattern": "/api/admin/trr-api/operations/[operationId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/operations/[operationId]/route.ts",
      "sourceLocator": {
        "line": 18,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/operations/[operationId]/stream",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/operations/[operationId]/stream",
      "pathPattern": "/api/admin/trr-api/operations/[operationId]/stream",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/operations/[operationId]/stream/route.ts",
      "sourceLocator": {
        "line": 27,
        "symbol": "GET"
      },
      "provenance": "manual_override",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "manual_override:operation_stream_progress"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "medium",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/trr-api/operations/health",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/operations/health",
      "pathPattern": "/api/admin/trr-api/operations/health",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/operations/health/route.ts",
      "sourceLocator": {
        "line": 10,
        "symbol": "GET"
      },
      "provenance": "manual_override",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "manual_override:health_checks_and_live_status"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/people",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/people",
      "pathPattern": "/api/admin/trr-api/people",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/people/route.ts",
      "sourceLocator": {
        "line": 20,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/people/[personId]",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/people/[personId]",
      "pathPattern": "/api/admin/trr-api/people/[personId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/route.ts",
      "sourceLocator": {
        "line": 37,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/people/[personId]/cover-photo",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/people/[personId]/cover-photo",
      "pathPattern": "/api/admin/trr-api/people/[personId]/cover-photo",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/cover-photo/route.ts",
      "sourceLocator": {
        "line": 47,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/people/[personId]/credits",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/people/[personId]/credits",
      "pathPattern": "/api/admin/trr-api/people/[personId]/credits",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/credits/route.ts",
      "sourceLocator": {
        "line": 329,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/people/[personId]/external-ids",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/people/[personId]/external-ids",
      "pathPattern": "/api/admin/trr-api/people/[personId]/external-ids",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/external-ids/route.ts",
      "sourceLocator": {
        "line": 26,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/people/[personId]/fandom",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/people/[personId]/fandom",
      "pathPattern": "/api/admin/trr-api/people/[personId]/fandom",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/fandom/route.ts",
      "sourceLocator": {
        "line": 17,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/people/[personId]/photos",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/people/[personId]/photos",
      "pathPattern": "/api/admin/trr-api/people/[personId]/photos",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/photos/route.ts",
      "sourceLocator": {
        "line": 39,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/people/[personId]/social-growth",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/people/[personId]/social-growth",
      "pathPattern": "/api/admin/trr-api/people/[personId]/social-growth",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/social-growth/route.ts",
      "sourceLocator": {
        "line": 18,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/people/home",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/people/home",
      "pathPattern": "/api/admin/trr-api/people/home",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/people/home/route.ts",
      "sourceLocator": {
        "line": 29,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/people/resolve-slug",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/people/resolve-slug",
      "pathPattern": "/api/admin/trr-api/people/resolve-slug",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/people/resolve-slug/route.ts",
      "sourceLocator": {
        "line": 29,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/search",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/search",
      "pathPattern": "/api/admin/trr-api/search",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/search/route.ts",
      "sourceLocator": {
        "line": 30,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/seasons/[seasonId]/episodes",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/seasons/[seasonId]/episodes",
      "pathPattern": "/api/admin/trr-api/seasons/[seasonId]/episodes",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/seasons/[seasonId]/episodes/route.ts",
      "sourceLocator": {
        "line": 25,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/seasons/[seasonId]/unassigned-backdrops",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/seasons/[seasonId]/unassigned-backdrops",
      "pathPattern": "/api/admin/trr-api/seasons/[seasonId]/unassigned-backdrops",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/seasons/[seasonId]/unassigned-backdrops/route.ts",
      "sourceLocator": {
        "line": 23,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows",
      "pathPattern": "/api/admin/trr-api/shows",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/route.ts",
      "sourceLocator": {
        "line": 31,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]",
      "pathPattern": "/api/admin/trr-api/shows/[showId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/route.ts",
      "sourceLocator": {
        "line": 94,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/assets",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/assets",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/assets",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/assets/route.ts",
      "sourceLocator": {
        "line": 31,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/bravo/news",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/bravo/news",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/bravo/news",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/bravo/news/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/bravo/videos",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/bravo/videos",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/bravo/videos",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/bravo/videos/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/cast",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/cast",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/cast",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/cast/route.ts",
      "sourceLocator": {
        "line": 32,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/cast-role-members",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/cast-role-members",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/cast-role-members",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/cast-role-members/route.ts",
      "sourceLocator": {
        "line": 68,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/credits",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/credits",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/credits",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/credits/route.ts",
      "sourceLocator": {
        "line": 28,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]/route.ts",
      "sourceLocator": {
        "line": 44,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/links",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/links",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/links",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/news",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/news",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/news",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/news/route.ts",
      "sourceLocator": {
        "line": 39,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/roles",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/roles",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/roles",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/roles/route.ts",
      "sourceLocator": {
        "line": 73,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/route.ts",
      "sourceLocator": {
        "line": 41,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/route.ts",
      "sourceLocator": {
        "line": 31,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast/route.ts",
      "sourceLocator": {
        "line": 28,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/comments-coverage",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/comments-coverage",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/comments-coverage",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/comments-coverage/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/mirror-coverage",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/mirror-coverage",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/mirror-coverage",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/mirror-coverage/route.ts",
      "sourceLocator": {
        "line": 22,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]/route.ts",
      "sourceLocator": {
        "line": 23,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/snapshot",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/snapshot",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/snapshot",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/snapshot/route.ts",
      "sourceLocator": {
        "line": 32,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/live-health",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/live-health",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/live-health",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/live-health/route.ts",
      "sourceLocator": {
        "line": 20,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/snapshot",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/snapshot",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/snapshot",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/snapshot/route.ts",
      "sourceLocator": {
        "line": 29,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/summary",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/summary",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/summary",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/summary/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/export",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/export",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/export",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/export/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/worker-health",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/worker-health",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/worker-health",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/worker-health/route.ts",
      "sourceLocator": {
        "line": 47,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/progress",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/progress",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/progress",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/progress/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/summary",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/summary",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/summary",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/summary/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/shared-status",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/shared-status",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/shared-status",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/shared-status/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/stream",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/stream",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/stream",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/stream/route.ts",
      "sourceLocator": {
        "line": 17,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts",
      "sourceLocator": {
        "line": 36,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/cast-members",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/cast-members",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/cast-members",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/cast-members/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/content-health",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/content-health",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/content-health",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/content-health/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/hashtags",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/hashtags",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/hashtags",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/hashtags/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/overview",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/overview",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/overview",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/overview/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/posts/[postId]/detail",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/posts/[postId]/detail",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/posts/[postId]/detail",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/posts/[postId]/detail/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sentiment-trends",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sentiment-trends",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sentiment-trends",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sentiment-trends/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/[soundId]",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/[soundId]",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/[soundId]",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/[soundId]/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/[soundId]/posts",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/[soundId]/posts",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/[soundId]/posts",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/[soundId]/posts/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/survey-cast",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/survey-cast",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/survey-cast",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/survey-cast/route.ts",
      "sourceLocator": {
        "line": 49,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/social-posts",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/social-posts",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/social-posts",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/social-posts/route.ts",
      "sourceLocator": {
        "line": 25,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/[showId]/surveys",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/[showId]/surveys",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/surveys",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/surveys/route.ts",
      "sourceLocator": {
        "line": 21,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/shows/resolve-slug",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/shows/resolve-slug",
      "pathPattern": "/api/admin/trr-api/shows/resolve-slug",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/shows/resolve-slug/route.ts",
      "sourceLocator": {
        "line": 26,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social-growth/cast-comparison/snapshot",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social-growth/cast-comparison/snapshot",
      "pathPattern": "/api/admin/trr-api/social-growth/cast-comparison/snapshot",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social-growth/cast-comparison/snapshot/route.ts",
      "sourceLocator": {
        "line": 36,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/ingest/health-dot",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/ingest/health-dot",
      "pathPattern": "/api/admin/trr-api/social/ingest/health-dot",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/health-dot/route.ts",
      "sourceLocator": {
        "line": 11,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/ingest/live-status",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/ingest/live-status",
      "pathPattern": "/api/admin/trr-api/social/ingest/live-status",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/live-status/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/ingest/live-status/stream",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/ingest/live-status/stream",
      "pathPattern": "/api/admin/trr-api/social/ingest/live-status/stream",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/live-status/stream/route.ts",
      "sourceLocator": {
        "line": 8,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "medium",
      "fanoutRisk": "high"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/ingest/queue-status",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/ingest/queue-status",
      "pathPattern": "/api/admin/trr-api/social/ingest/queue-status",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/queue-status/route.ts",
      "sourceLocator": {
        "line": 11,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/ingest/workers/[workerId]/detail",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/ingest/workers/[workerId]/detail",
      "pathPattern": "/api/admin/trr-api/social/ingest/workers/[workerId]/detail",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/workers/[workerId]/detail/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis/route.ts",
      "sourceLocator": {
        "line": 32,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/posts",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/posts",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/posts",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/posts/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/review-queue",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/review-queue",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/review-queue",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/review-queue/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/progress",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/progress",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/progress",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/progress/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/verification",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/verification",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/verification",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/verification/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/collaborators-tags",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/collaborators-tags",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/collaborators-tags",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/collaborators-tags/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/cookies/health",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/cookies/health",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/cookies/health",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/cookies/health/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags/timeline",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags/timeline",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags/timeline",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags/timeline/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/posts",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/posts",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/posts",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/posts/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/snapshot",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/snapshot",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/snapshot",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/snapshot/route.ts",
      "sourceLocator": {
        "line": 29,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/socialblade",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/socialblade",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/socialblade",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/socialblade/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/summary",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/profiles/[platform]/[handle]/summary",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/summary",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/summary/route.ts",
      "sourceLocator": {
        "line": 26,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/shared/review-queue",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/shared/review-queue",
      "pathPattern": "/api/admin/trr-api/social/shared/review-queue",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/shared/review-queue/route.ts",
      "sourceLocator": {
        "line": 10,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/shared/runs",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/shared/runs",
      "pathPattern": "/api/admin/trr-api/social/shared/runs",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/shared/runs/route.ts",
      "sourceLocator": {
        "line": 10,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:GET:/api/admin/trr-api/social/shared/sources",
      "kind": "api_route",
      "title": "GET /api/admin/trr-api/social/shared/sources",
      "pathPattern": "/api/admin/trr-api/social/shared/sources",
      "symbol": "GET",
      "sourceFile": "src/app/api/admin/trr-api/social/shared/sources/route.ts",
      "sourceLocator": {
        "line": 10,
        "symbol": "GET"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PATCH:/api/admin/flashback/quizzes/[quizId]",
      "kind": "api_route",
      "title": "PATCH /api/admin/flashback/quizzes/[quizId]",
      "pathPattern": "/api/admin/flashback/quizzes/[quizId]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/flashback/quizzes/[quizId]/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PATCH:/api/admin/networks-streaming/overrides/[id]",
      "kind": "api_route",
      "title": "PATCH /api/admin/networks-streaming/overrides/[id]",
      "pathPattern": "/api/admin/networks-streaming/overrides/[id]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/networks-streaming/overrides/[id]/route.ts",
      "sourceLocator": {
        "line": 51,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:PATCH:/api/admin/reddit/communities/[communityId]",
      "kind": "api_route",
      "title": "PATCH /api/admin/reddit/communities/[communityId]",
      "pathPattern": "/api/admin/reddit/communities/[communityId]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/route.ts",
      "sourceLocator": {
        "line": 79,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PATCH:/api/admin/reddit/post-matches",
      "kind": "api_route",
      "title": "PATCH /api/admin/reddit/post-matches",
      "pathPattern": "/api/admin/reddit/post-matches",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/reddit/post-matches/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PATCH:/api/admin/reddit/threads/[threadId]",
      "kind": "api_route",
      "title": "PATCH /api/admin/reddit/threads/[threadId]",
      "pathPattern": "/api/admin/reddit/threads/[threadId]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/reddit/threads/[threadId]/route.ts",
      "sourceLocator": {
        "line": 102,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PATCH:/api/admin/trr-api/brands/families/[familyId]",
      "kind": "api_route",
      "title": "PATCH /api/admin/trr-api/brands/families/[familyId]",
      "pathPattern": "/api/admin/trr-api/brands/families/[familyId]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PATCH:/api/admin/trr-api/brands/families/[familyId]/links/[ruleId]",
      "kind": "api_route",
      "title": "PATCH /api/admin/trr-api/brands/families/[familyId]/links/[ruleId]",
      "pathPattern": "/api/admin/trr-api/brands/families/[familyId]/links/[ruleId]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/links/[ruleId]/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PATCH:/api/admin/trr-api/cast-photos/[photoId]/people-count",
      "kind": "api_route",
      "title": "PATCH /api/admin/trr-api/cast-photos/[photoId]/people-count",
      "pathPattern": "/api/admin/trr-api/cast-photos/[photoId]/people-count",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/people-count/route.ts",
      "sourceLocator": {
        "line": 32,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PATCH:/api/admin/trr-api/cast-screentime/[...path]",
      "kind": "api_route",
      "title": "PATCH /api/admin/trr-api/cast-screentime/[...path]",
      "pathPattern": "/api/admin/trr-api/cast-screentime/[...path]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/cast-screentime/[...path]/route.ts",
      "sourceLocator": {
        "line": 73,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PATCH:/api/admin/trr-api/media-links/[linkId]/context",
      "kind": "api_route",
      "title": "PATCH /api/admin/trr-api/media-links/[linkId]/context",
      "pathPattern": "/api/admin/trr-api/media-links/[linkId]/context",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/media-links/[linkId]/context/route.ts",
      "sourceLocator": {
        "line": 76,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PATCH:/api/admin/trr-api/people/[personId]",
      "kind": "api_route",
      "title": "PATCH /api/admin/trr-api/people/[personId]",
      "pathPattern": "/api/admin/trr-api/people/[personId]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/route.ts",
      "sourceLocator": {
        "line": 130,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PATCH:/api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed",
      "kind": "api_route",
      "title": "PATCH /api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed",
      "pathPattern": "/api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed/route.ts",
      "sourceLocator": {
        "line": 17,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PATCH:/api/admin/trr-api/shows/[showId]/links/[linkId]",
      "kind": "api_route",
      "title": "PATCH /api/admin/trr-api/shows/[showId]/links/[linkId]",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/links/[linkId]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/[linkId]/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:PATCH:/api/admin/trr-api/shows/[showId]/roles/[roleId]",
      "kind": "api_route",
      "title": "PATCH /api/admin/trr-api/shows/[showId]/roles/[roleId]",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/roles/[roleId]",
      "symbol": "PATCH",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/roles/[roleId]/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "PATCH"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/auth/status/reset",
      "kind": "api_route",
      "title": "POST /api/admin/auth/status/reset",
      "pathPattern": "/api/admin/auth/status/reset",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/auth/status/reset/route.ts",
      "sourceLocator": {
        "line": 8,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/covered-shows",
      "kind": "api_route",
      "title": "POST /api/admin/covered-shows",
      "pathPattern": "/api/admin/covered-shows",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/covered-shows/route.ts",
      "sourceLocator": {
        "line": 140,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/design-system/typography/sets",
      "kind": "api_route",
      "title": "POST /api/admin/design-system/typography/sets",
      "pathPattern": "/api/admin/design-system/typography/sets",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/design-system/typography/sets/route.ts",
      "sourceLocator": {
        "line": 27,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/flashback/quizzes",
      "kind": "api_route",
      "title": "POST /api/admin/flashback/quizzes",
      "pathPattern": "/api/admin/flashback/quizzes",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/flashback/quizzes/route.ts",
      "sourceLocator": {
        "line": 23,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/flashback/quizzes/[quizId]/events",
      "kind": "api_route",
      "title": "POST /api/admin/flashback/quizzes/[quizId]/events",
      "pathPattern": "/api/admin/flashback/quizzes/[quizId]/events",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/flashback/quizzes/[quizId]/events/route.ts",
      "sourceLocator": {
        "line": 29,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/getty-local/scrape",
      "kind": "api_route",
      "title": "POST /api/admin/getty-local/scrape",
      "pathPattern": "/api/admin/getty-local/scrape",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/getty-local/scrape/route.ts",
      "sourceLocator": {
        "line": 48,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/networks-streaming/overrides",
      "kind": "api_route",
      "title": "POST /api/admin/networks-streaming/overrides",
      "pathPattern": "/api/admin/networks-streaming/overrides",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/networks-streaming/overrides/route.ts",
      "sourceLocator": {
        "line": 102,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/networks-streaming/sync",
      "kind": "api_route",
      "title": "POST /api/admin/networks-streaming/sync",
      "pathPattern": "/api/admin/networks-streaming/sync",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/networks-streaming/sync/route.ts",
      "sourceLocator": {
        "line": 105,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/normalized-surveys",
      "kind": "api_route",
      "title": "POST /api/admin/normalized-surveys",
      "pathPattern": "/api/admin/normalized-surveys",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/normalized-surveys/route.ts",
      "sourceLocator": {
        "line": 37,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/normalized-surveys/[surveySlug]/questions",
      "kind": "api_route",
      "title": "POST /api/admin/normalized-surveys/[surveySlug]/questions",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/questions",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/questions/route.ts",
      "sourceLocator": {
        "line": 41,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
      "kind": "api_route",
      "title": "POST /api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options/route.ts",
      "sourceLocator": {
        "line": 45,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/normalized-surveys/[surveySlug]/runs",
      "kind": "api_route",
      "title": "POST /api/admin/normalized-surveys/[surveySlug]/runs",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/runs",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/runs/route.ts",
      "sourceLocator": {
        "line": 56,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/recent-people",
      "kind": "api_route",
      "title": "POST /api/admin/recent-people",
      "pathPattern": "/api/admin/recent-people",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/recent-people/route.ts",
      "sourceLocator": {
        "line": 92,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/reddit/auto-categorize-flairs-batch",
      "kind": "api_route",
      "title": "POST /api/admin/reddit/auto-categorize-flairs-batch",
      "pathPattern": "/api/admin/reddit/auto-categorize-flairs-batch",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/reddit/auto-categorize-flairs-batch/route.ts",
      "sourceLocator": {
        "line": 18,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/reddit/communities",
      "kind": "api_route",
      "title": "POST /api/admin/reddit/communities",
      "pathPattern": "/api/admin/reddit/communities",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/reddit/communities/route.ts",
      "sourceLocator": {
        "line": 129,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/reddit/communities/[communityId]/auto-categorize-flairs",
      "kind": "api_route",
      "title": "POST /api/admin/reddit/communities/[communityId]/auto-categorize-flairs",
      "pathPattern": "/api/admin/reddit/communities/[communityId]/auto-categorize-flairs",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/auto-categorize-flairs/route.ts",
      "sourceLocator": {
        "line": 22,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/reddit/communities/[communityId]/episode-discussions/save",
      "kind": "api_route",
      "title": "POST /api/admin/reddit/communities/[communityId]/episode-discussions/save",
      "pathPattern": "/api/admin/reddit/communities/[communityId]/episode-discussions/save",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/episode-discussions/save/route.ts",
      "sourceLocator": {
        "line": 115,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/reddit/communities/[communityId]/flairs/refresh",
      "kind": "api_route",
      "title": "POST /api/admin/reddit/communities/[communityId]/flairs/refresh",
      "pathPattern": "/api/admin/reddit/communities/[communityId]/flairs/refresh",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/reddit/communities/[communityId]/flairs/refresh/route.ts",
      "sourceLocator": {
        "line": 17,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/reddit/runs/backfill",
      "kind": "api_route",
      "title": "POST /api/admin/reddit/runs/backfill",
      "pathPattern": "/api/admin/reddit/runs/backfill",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/reddit/runs/backfill/route.ts",
      "sourceLocator": {
        "line": 18,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/reddit/threads",
      "kind": "api_route",
      "title": "POST /api/admin/reddit/threads",
      "pathPattern": "/api/admin/reddit/threads",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/reddit/threads/route.ts",
      "sourceLocator": {
        "line": 127,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/scrape/import",
      "kind": "api_route",
      "title": "POST /api/admin/scrape/import",
      "pathPattern": "/api/admin/scrape/import",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/scrape/import/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/scrape/import/stream",
      "kind": "api_route",
      "title": "POST /api/admin/scrape/import/stream",
      "pathPattern": "/api/admin/scrape/import/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/scrape/import/stream/route.ts",
      "sourceLocator": {
        "line": 21,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "medium",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/scrape/preview",
      "kind": "api_route",
      "title": "POST /api/admin/scrape/preview",
      "pathPattern": "/api/admin/scrape/preview",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/scrape/preview/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/shows",
      "kind": "api_route",
      "title": "POST /api/admin/shows",
      "pathPattern": "/api/admin/shows",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/shows/route.ts",
      "sourceLocator": {
        "line": 48,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/shows/[showKey]/icons",
      "kind": "api_route",
      "title": "POST /api/admin/shows/[showKey]/icons",
      "pathPattern": "/api/admin/shows/[showKey]/icons",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/shows/[showKey]/icons/route.ts",
      "sourceLocator": {
        "line": 45,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/shows/[showKey]/seasons",
      "kind": "api_route",
      "title": "POST /api/admin/shows/[showKey]/seasons",
      "pathPattern": "/api/admin/shows/[showKey]/seasons",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/shows/[showKey]/seasons/route.ts",
      "sourceLocator": {
        "line": 38,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/shows/palette-library",
      "kind": "api_route",
      "title": "POST /api/admin/shows/palette-library",
      "pathPattern": "/api/admin/shows/palette-library",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/shows/palette-library/route.ts",
      "sourceLocator": {
        "line": 107,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/surveys/[surveyKey]/cast",
      "kind": "api_route",
      "title": "POST /api/admin/surveys/[surveyKey]/cast",
      "pathPattern": "/api/admin/surveys/[surveyKey]/cast",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/cast/route.ts",
      "sourceLocator": {
        "line": 38,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/surveys/[surveyKey]/episodes",
      "kind": "api_route",
      "title": "POST /api/admin/surveys/[surveyKey]/episodes",
      "pathPattern": "/api/admin/surveys/[surveyKey]/episodes",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/episodes/route.ts",
      "sourceLocator": {
        "line": 38,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/surveys/[surveyKey]/episodes/[episodeId]/activate",
      "kind": "api_route",
      "title": "POST /api/admin/surveys/[surveyKey]/episodes/[episodeId]/activate",
      "pathPattern": "/api/admin/surveys/[surveyKey]/episodes/[episodeId]/activate",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/episodes/[episodeId]/activate/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/assets/archive",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/assets/archive",
      "pathPattern": "/api/admin/trr-api/assets/archive",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/assets/archive/route.ts",
      "sourceLocator": {
        "line": 13,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/assets/content-type",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/assets/content-type",
      "pathPattern": "/api/admin/trr-api/assets/content-type",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/assets/content-type/route.ts",
      "sourceLocator": {
        "line": 13,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/assets/star",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/assets/star",
      "pathPattern": "/api/admin/trr-api/assets/star",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/assets/star/route.ts",
      "sourceLocator": {
        "line": 13,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/brands/families",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/brands/families",
      "pathPattern": "/api/admin/trr-api/brands/families",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/route.ts",
      "sourceLocator": {
        "line": 49,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/brands/families/[familyId]/links",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/brands/families/[familyId]/links",
      "pathPattern": "/api/admin/trr-api/brands/families/[familyId]/links",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/links/route.ts",
      "sourceLocator": {
        "line": 51,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/brands/families/[familyId]/links/apply",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/brands/families/[familyId]/links/apply",
      "pathPattern": "/api/admin/trr-api/brands/families/[familyId]/links/apply",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/links/apply/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/brands/families/[familyId]/members",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/brands/families/[familyId]/members",
      "pathPattern": "/api/admin/trr-api/brands/families/[familyId]/members",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/members/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/brands/families/[familyId]/wikipedia-import",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/brands/families/[familyId]/wikipedia-import",
      "pathPattern": "/api/admin/trr-api/brands/families/[familyId]/wikipedia-import",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/wikipedia-import/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/apply",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/brands/franchise-rules/[franchiseKey]/apply",
      "pathPattern": "/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/apply",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/apply/route.ts",
      "sourceLocator": {
        "line": 17,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/brands/logos/options/assign",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/brands/logos/options/assign",
      "pathPattern": "/api/admin/trr-api/brands/logos/options/assign",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/assign/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/brands/logos/options/discover",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/brands/logos/options/discover",
      "pathPattern": "/api/admin/trr-api/brands/logos/options/discover",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/discover/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/brands/logos/options/select",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/brands/logos/options/select",
      "pathPattern": "/api/admin/trr-api/brands/logos/options/select",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/select/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/brands/logos/options/source-query",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/brands/logos/options/source-query",
      "pathPattern": "/api/admin/trr-api/brands/logos/options/source-query",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/source-query/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/brands/logos/sync",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/brands/logos/sync",
      "pathPattern": "/api/admin/trr-api/brands/logos/sync",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/sync/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/bravotv/images/people/[personId]/stream",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/bravotv/images/people/[personId]/stream",
      "pathPattern": "/api/admin/trr-api/bravotv/images/people/[personId]/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/people/[personId]/stream/route.ts",
      "sourceLocator": {
        "line": 17,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/bravotv/images/shows/[showId]/stream",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/bravotv/images/shows/[showId]/stream",
      "pathPattern": "/api/admin/trr-api/bravotv/images/shows/[showId]/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/shows/[showId]/stream/route.ts",
      "sourceLocator": {
        "line": 17,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/cast-photos/[photoId]/auto-count",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/cast-photos/[photoId]/auto-count",
      "pathPattern": "/api/admin/trr-api/cast-photos/[photoId]/auto-count",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/auto-count/route.ts",
      "sourceLocator": {
        "line": 35,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/cast-photos/[photoId]/detect-text-overlay",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/cast-photos/[photoId]/detect-text-overlay",
      "pathPattern": "/api/admin/trr-api/cast-photos/[photoId]/detect-text-overlay",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/detect-text-overlay/route.ts",
      "sourceLocator": {
        "line": 38,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/cast-photos/[photoId]/mirror",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/cast-photos/[photoId]/mirror",
      "pathPattern": "/api/admin/trr-api/cast-photos/[photoId]/mirror",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/mirror/route.ts",
      "sourceLocator": {
        "line": 35,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/cast-photos/[photoId]/variants",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/cast-photos/[photoId]/variants",
      "pathPattern": "/api/admin/trr-api/cast-photos/[photoId]/variants",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/variants/route.ts",
      "sourceLocator": {
        "line": 35,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/cast-screentime/[...path]",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/cast-screentime/[...path]",
      "pathPattern": "/api/admin/trr-api/cast-screentime/[...path]",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/cast-screentime/[...path]/route.ts",
      "sourceLocator": {
        "line": 69,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/media-assets/[assetId]/auto-count",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/media-assets/[assetId]/auto-count",
      "pathPattern": "/api/admin/trr-api/media-assets/[assetId]/auto-count",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/auto-count/route.ts",
      "sourceLocator": {
        "line": 35,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/media-assets/[assetId]/detect-text-overlay",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/media-assets/[assetId]/detect-text-overlay",
      "pathPattern": "/api/admin/trr-api/media-assets/[assetId]/detect-text-overlay",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/detect-text-overlay/route.ts",
      "sourceLocator": {
        "line": 35,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/media-assets/[assetId]/mirror",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/media-assets/[assetId]/mirror",
      "pathPattern": "/api/admin/trr-api/media-assets/[assetId]/mirror",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/mirror/route.ts",
      "sourceLocator": {
        "line": 35,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/media-assets/[assetId]/replace-from-url",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/media-assets/[assetId]/replace-from-url",
      "pathPattern": "/api/admin/trr-api/media-assets/[assetId]/replace-from-url",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/replace-from-url/route.ts",
      "sourceLocator": {
        "line": 32,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/media-assets/[assetId]/reverse-image-search",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/media-assets/[assetId]/reverse-image-search",
      "pathPattern": "/api/admin/trr-api/media-assets/[assetId]/reverse-image-search",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/reverse-image-search/route.ts",
      "sourceLocator": {
        "line": 32,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/media-assets/[assetId]/variants",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/media-assets/[assetId]/variants",
      "pathPattern": "/api/admin/trr-api/media-assets/[assetId]/variants",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/variants/route.ts",
      "sourceLocator": {
        "line": 35,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/media-links",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/media-links",
      "pathPattern": "/api/admin/trr-api/media-links",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/media-links/route.ts",
      "sourceLocator": {
        "line": 17,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/operations/[operationId]/cancel",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/operations/[operationId]/cancel",
      "pathPattern": "/api/admin/trr-api/operations/[operationId]/cancel",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/operations/[operationId]/cancel/route.ts",
      "sourceLocator": {
        "line": 18,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/operations/cancel",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/operations/cancel",
      "pathPattern": "/api/admin/trr-api/operations/cancel",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/operations/cancel/route.ts",
      "sourceLocator": {
        "line": 9,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/operations/stale/cancel",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/operations/stale/cancel",
      "pathPattern": "/api/admin/trr-api/operations/stale/cancel",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/operations/stale/cancel/route.ts",
      "sourceLocator": {
        "line": 8,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/people/[personId]/import-fandom/commit",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/people/[personId]/import-fandom/commit",
      "pathPattern": "/api/admin/trr-api/people/[personId]/import-fandom/commit",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/import-fandom/commit/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/people/[personId]/import-fandom/preview",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/people/[personId]/import-fandom/preview",
      "pathPattern": "/api/admin/trr-api/people/[personId]/import-fandom/preview",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/import-fandom/preview/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/people/[personId]/refresh-images",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/people/[personId]/refresh-images",
      "pathPattern": "/api/admin/trr-api/people/[personId]/refresh-images",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/refresh-images/route.ts",
      "sourceLocator": {
        "line": 63,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment",
      "pathPattern": "/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/people/[personId]/refresh-images/stream",
      "pathPattern": "/api/admin/trr-api/people/[personId]/refresh-images/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/refresh-images/stream/route.ts",
      "sourceLocator": {
        "line": 206,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/people/[personId]/refresh-profile/stream",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/people/[personId]/refresh-profile/stream",
      "pathPattern": "/api/admin/trr-api/people/[personId]/refresh-profile/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/refresh-profile/stream/route.ts",
      "sourceLocator": {
        "line": 209,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/people/[personId]/reprocess-images/stream",
      "pathPattern": "/api/admin/trr-api/people/[personId]/reprocess-images/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/reprocess-images/stream/route.ts",
      "sourceLocator": {
        "line": 192,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/people/[personId]/social-growth/refresh",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/people/[personId]/social-growth/refresh",
      "pathPattern": "/api/admin/trr-api/people/[personId]/social-growth/refresh",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/social-growth/refresh/route.ts",
      "sourceLocator": {
        "line": 19,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/seasons/[seasonId]/assign-backdrops",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/seasons/[seasonId]/assign-backdrops",
      "pathPattern": "/api/admin/trr-api/seasons/[seasonId]/assign-backdrops",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/seasons/[seasonId]/assign-backdrops/route.ts",
      "sourceLocator": {
        "line": 29,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream/route.ts",
      "sourceLocator": {
        "line": 175,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/auto-count-images",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/auto-count-images",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/auto-count-images",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/auto-count-images/route.ts",
      "sourceLocator": {
        "line": 33,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails/route.ts",
      "sourceLocator": {
        "line": 38,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/cast-matrix/sync",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/cast-matrix/sync",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/cast-matrix/sync",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/cast-matrix/sync/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/cast/[personId]/roles",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/cast/[personId]/roles",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/cast/[personId]/roles",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/cast/[personId]/roles/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/get-images/stream",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/get-images/stream",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/get-images/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/get-images/stream/route.ts",
      "sourceLocator": {
        "line": 26,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/google-news/sync",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/google-news/sync",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/google-news/sync",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/google-news/sync/route.ts",
      "sourceLocator": {
        "line": 45,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/commit",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/import-bravo/commit",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/import-bravo/commit",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/import-bravo/commit/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/import-bravo/preview",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/import-bravo/preview",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/import-bravo/preview/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/import-bravo/preview/stream",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream/route.ts",
      "sourceLocator": {
        "line": 175,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/links",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/links",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/links",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/route.ts",
      "sourceLocator": {
        "line": 43,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/links/add",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/links/add",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/links/add",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/add/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/links/discover",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/links/discover",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/links/discover",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/discover/route.ts",
      "sourceLocator": {
        "line": 20,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/links/discover/stream",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/links/discover/stream",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/links/discover/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/discover/stream/route.ts",
      "sourceLocator": {
        "line": 247,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/logos/featured",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/logos/featured",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/logos/featured",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/logos/featured/route.ts",
      "sourceLocator": {
        "line": 56,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/refresh",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/refresh",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/refresh",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/refresh/route.ts",
      "sourceLocator": {
        "line": 33,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/refresh-photos/stream",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/refresh-photos/stream",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/refresh-photos/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/refresh-photos/stream/route.ts",
      "sourceLocator": {
        "line": 191,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/refresh/stream",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/refresh/stream",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/refresh/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/refresh/stream/route.ts",
      "sourceLocator": {
        "line": 178,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/refresh/target/[target]/retry",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/refresh/target/[target]/retry",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/refresh/target/[target]/retry",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/refresh/target/[target]/retry/route.ts",
      "sourceLocator": {
        "line": 36,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/roles",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/roles",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/roles",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/roles/route.ts",
      "sourceLocator": {
        "line": 210,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream/route.ts",
      "sourceLocator": {
        "line": 175,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "continuous",
      "polls": true,
      "pollCadenceMs": null,
      "automatic": true,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]/route.ts",
      "sourceLocator": {
        "line": 88,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/runs/[runId]/cancel",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/runs/[runId]/cancel",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/runs/[runId]/cancel",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/runs/[runId]/cancel/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/mirror/requeue",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/mirror/requeue",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/mirror/requeue",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/mirror/requeue/route.ts",
      "sourceLocator": {
        "line": 40,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/cancel",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/cancel",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/cancel",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/cancel/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/cancel",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/cancel",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/cancel",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/cancel/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/retry",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/retry",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/retry",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/retry/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/social-posts",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/social-posts",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/social-posts",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/social-posts/route.ts",
      "sourceLocator": {
        "line": 79,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/[showId]/surveys",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/[showId]/surveys",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/surveys",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/surveys/route.ts",
      "sourceLocator": {
        "line": 59,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/shows/sync-from-lists",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/shows/sync-from-lists",
      "pathPattern": "/api/admin/trr-api/shows/sync-from-lists",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/shows/sync-from-lists/route.ts",
      "sourceLocator": {
        "line": 29,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/snapshots/invalidate",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/snapshots/invalidate",
      "pathPattern": "/api/admin/trr-api/snapshots/invalidate",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/snapshots/invalidate/route.ts",
      "sourceLocator": {
        "line": 35,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social-growth/refresh-batch",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social-growth/refresh-batch",
      "pathPattern": "/api/admin/trr-api/social-growth/refresh-batch",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social-growth/refresh-batch/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/ingest/active-jobs/cancel",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/ingest/active-jobs/cancel",
      "pathPattern": "/api/admin/trr-api/social/ingest/active-jobs/cancel",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/active-jobs/cancel/route.ts",
      "sourceLocator": {
        "line": 11,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/ingest/jobs/[jobId]/debug",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/ingest/jobs/[jobId]/debug",
      "pathPattern": "/api/admin/trr-api/social/ingest/jobs/[jobId]/debug",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/jobs/[jobId]/debug/route.ts",
      "sourceLocator": {
        "line": 16,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/ingest/recent-failures/dismiss",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/ingest/recent-failures/dismiss",
      "pathPattern": "/api/admin/trr-api/social/ingest/recent-failures/dismiss",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/recent-failures/dismiss/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/ingest/reset-health",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/ingest/reset-health",
      "pathPattern": "/api/admin/trr-api/social/ingest/reset-health",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/reset-health/route.ts",
      "sourceLocator": {
        "line": 11,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "high",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/ingest/stuck-jobs/cancel",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/ingest/stuck-jobs/cancel",
      "pathPattern": "/api/admin/trr-api/social/ingest/stuck-jobs/cancel",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/stuck-jobs/cancel/route.ts",
      "sourceLocator": {
        "line": 12,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/ingest/workers/purge-inactive",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/ingest/workers/purge-inactive",
      "pathPattern": "/api/admin/trr-api/social/ingest/workers/purge-inactive",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/workers/purge-inactive/route.ts",
      "sourceLocator": {
        "line": 11,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/apify-backfill",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/apify-backfill",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/apify-backfill",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/apify-backfill/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/backfill",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/backfill",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/backfill",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/backfill/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/freshness",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/freshness",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/freshness",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/freshness/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis/run",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis/run",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis/run",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis/run/route.ts",
      "sourceLocator": {
        "line": 32,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/resume-tail",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/resume-tail",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/resume-tail",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/resume-tail/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/review-queue/[itemId]/resolve",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/review-queue/[itemId]/resolve",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/review-queue/[itemId]/resolve",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/review-queue/[itemId]/resolve/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/cancel",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/cancel",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/cancel",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/cancel/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/dismiss",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/dismiss",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/dismiss",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/dismiss/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/repair-auth",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/repair-auth",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/repair-auth",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/repair-auth/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/sync-newer",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/sync-newer",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/sync-newer",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/sync-newer/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/sync-recent",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/sync-recent",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/sync-recent",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/sync-recent/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/cookies/refresh",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/cookies/refresh",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/cookies/refresh",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/cookies/refresh/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/socialblade/refresh",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/profiles/[platform]/[handle]/socialblade/refresh",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/socialblade/refresh",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/socialblade/refresh/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/shared/ingest",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/shared/ingest",
      "pathPattern": "/api/admin/trr-api/social/shared/ingest",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/shared/ingest/route.ts",
      "sourceLocator": {
        "line": 10,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:POST:/api/admin/trr-api/social/shared/review-queue/[itemId]/resolve",
      "kind": "api_route",
      "title": "POST /api/admin/trr-api/social/shared/review-queue/[itemId]/resolve",
      "pathPattern": "/api/admin/trr-api/social/shared/review-queue/[itemId]/resolve",
      "symbol": "POST",
      "sourceFile": "src/app/api/admin/trr-api/social/shared/review-queue/[itemId]/resolve/route.ts",
      "sourceLocator": {
        "line": 14,
        "symbol": "POST"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/design-system/typography/assignments",
      "kind": "api_route",
      "title": "PUT /api/admin/design-system/typography/assignments",
      "pathPattern": "/api/admin/design-system/typography/assignments",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/design-system/typography/assignments/route.ts",
      "sourceLocator": {
        "line": 27,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/design-system/typography/sets/[setId]",
      "kind": "api_route",
      "title": "PUT /api/admin/design-system/typography/sets/[setId]",
      "pathPattern": "/api/admin/design-system/typography/sets/[setId]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/design-system/typography/sets/[setId]/route.ts",
      "sourceLocator": {
        "line": 34,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/images/[imageType]/[imageId]/archive",
      "kind": "api_route",
      "title": "PUT /api/admin/images/[imageType]/[imageId]/archive",
      "pathPattern": "/api/admin/images/[imageType]/[imageId]/archive",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/images/[imageType]/[imageId]/archive/route.ts",
      "sourceLocator": {
        "line": 26,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/images/[imageType]/[imageId]/reassign",
      "kind": "api_route",
      "title": "PUT /api/admin/images/[imageType]/[imageId]/reassign",
      "pathPattern": "/api/admin/images/[imageType]/[imageId]/reassign",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/images/[imageType]/[imageId]/reassign/route.ts",
      "sourceLocator": {
        "line": 29,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/normalized-surveys/[surveySlug]",
      "kind": "api_route",
      "title": "PUT /api/admin/normalized-surveys/[surveySlug]",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/route.ts",
      "sourceLocator": {
        "line": 44,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]",
      "kind": "api_route",
      "title": "PUT /api/admin/normalized-surveys/[surveySlug]/questions/[questionId]",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/route.ts",
      "sourceLocator": {
        "line": 43,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
      "kind": "api_route",
      "title": "PUT /api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options/route.ts",
      "sourceLocator": {
        "line": 88,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/normalized-surveys/[surveySlug]/runs/[runId]",
      "kind": "api_route",
      "title": "PUT /api/admin/normalized-surveys/[surveySlug]/runs/[runId]",
      "pathPattern": "/api/admin/normalized-surveys/[surveySlug]/runs/[runId]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/route.ts",
      "sourceLocator": {
        "line": 43,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/shows/[showKey]",
      "kind": "api_route",
      "title": "PUT /api/admin/shows/[showKey]",
      "pathPattern": "/api/admin/shows/[showKey]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/shows/[showKey]/route.ts",
      "sourceLocator": {
        "line": 50,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/shows/[showKey]/seasons/[seasonId]",
      "kind": "api_route",
      "title": "PUT /api/admin/shows/[showKey]/seasons/[seasonId]",
      "pathPattern": "/api/admin/shows/[showKey]/seasons/[seasonId]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/shows/[showKey]/seasons/[seasonId]/route.ts",
      "sourceLocator": {
        "line": 52,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/social-posts/[postId]",
      "kind": "api_route",
      "title": "PUT /api/admin/social-posts/[postId]",
      "pathPattern": "/api/admin/social-posts/[postId]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/social-posts/[postId]/route.ts",
      "sourceLocator": {
        "line": 90,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:PUT:/api/admin/surveys/[surveyKey]",
      "kind": "api_route",
      "title": "PUT /api/admin/surveys/[surveyKey]",
      "pathPattern": "/api/admin/surveys/[surveyKey]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/route.ts",
      "sourceLocator": {
        "line": 260,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:PUT:/api/admin/surveys/[surveyKey]/cast/[castId]",
      "kind": "api_route",
      "title": "PUT /api/admin/surveys/[surveyKey]/cast/[castId]",
      "pathPattern": "/api/admin/surveys/[surveyKey]/cast/[castId]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/cast/[castId]/route.ts",
      "sourceLocator": {
        "line": 41,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/surveys/[surveyKey]/cast/reorder",
      "kind": "api_route",
      "title": "PUT /api/admin/surveys/[surveyKey]/cast/reorder",
      "pathPattern": "/api/admin/surveys/[surveyKey]/cast/reorder",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/cast/reorder/route.ts",
      "sourceLocator": {
        "line": 15,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/surveys/[surveyKey]/episodes/[episodeId]",
      "kind": "api_route",
      "title": "PUT /api/admin/surveys/[surveyKey]/episodes/[episodeId]",
      "pathPattern": "/api/admin/surveys/[surveyKey]/episodes/[episodeId]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/episodes/[episodeId]/route.ts",
      "sourceLocator": {
        "line": 41,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/surveys/[surveyKey]/theme",
      "kind": "api_route",
      "title": "PUT /api/admin/surveys/[surveyKey]/theme",
      "pathPattern": "/api/admin/surveys/[surveyKey]/theme",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/surveys/[surveyKey]/theme/route.ts",
      "sourceLocator": {
        "line": 48,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/trr-api/brands/franchise-rules/[franchiseKey]",
      "kind": "api_route",
      "title": "PUT /api/admin/trr-api/brands/franchise-rules/[franchiseKey]",
      "pathPattern": "/api/admin/trr-api/brands/franchise-rules/[franchiseKey]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/route.ts",
      "sourceLocator": {
        "line": 17,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/trr-api/cast-photos/[photoId]/tags",
      "kind": "api_route",
      "title": "PUT /api/admin/trr-api/cast-photos/[photoId]/tags",
      "pathPattern": "/api/admin/trr-api/cast-photos/[photoId]/tags",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/tags/route.ts",
      "sourceLocator": {
        "line": 146,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/trr-api/media-links/[linkId]/tags",
      "kind": "api_route",
      "title": "PUT /api/admin/trr-api/media-links/[linkId]/tags",
      "pathPattern": "/api/admin/trr-api/media-links/[linkId]/tags",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/trr-api/media-links/[linkId]/tags/route.ts",
      "sourceLocator": {
        "line": 151,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:PUT:/api/admin/trr-api/people/[personId]/cover-photo",
      "kind": "api_route",
      "title": "PUT /api/admin/trr-api/people/[personId]/cover-photo",
      "pathPattern": "/api/admin/trr-api/people/[personId]/cover-photo",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/cover-photo/route.ts",
      "sourceLocator": {
        "line": 110,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/trr-api/people/[personId]/external-ids",
      "kind": "api_route",
      "title": "PUT /api/admin/trr-api/people/[personId]/external-ids",
      "pathPattern": "/api/admin/trr-api/people/[personId]/external-ids",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/external-ids/route.ts",
      "sourceLocator": {
        "line": 73,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop",
      "kind": "api_route",
      "title": "PUT /api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop",
      "pathPattern": "/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop/route.ts",
      "sourceLocator": {
        "line": 70,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "gallery",
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/trr-api/shows/[showId]",
      "kind": "api_route",
      "title": "PUT /api/admin/trr-api/shows/[showId]",
      "pathPattern": "/api/admin/trr-api/shows/[showId]",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/route.ts",
      "sourceLocator": {
        "line": 154,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets",
      "kind": "api_route",
      "title": "PUT /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts",
      "sourceLocator": {
        "line": 80,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/survey-cast",
      "kind": "api_route",
      "title": "PUT /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/survey-cast",
      "pathPattern": "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/survey-cast",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/survey-cast/route.ts",
      "sourceLocator": {
        "line": 139,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": true,
      "usesPagination": true,
      "returnsWideRowsOrBlobsOrRawJson": true,
      "fansOutQueries": true,
      "postgresAccess": "none",
      "viewKinds": [
        "list",
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "high",
      "fanoutRisk": "high"
    },
    {
      "id": "route:PUT:/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags",
      "kind": "api_route",
      "title": "PUT /api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags",
      "pathPattern": "/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags/route.ts",
      "sourceLocator": {
        "line": 33,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [
        "detail"
      ],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    },
    {
      "id": "route:PUT:/api/admin/trr-api/social/shared/sources",
      "kind": "api_route",
      "title": "PUT /api/admin/trr-api/social/shared/sources",
      "pathPattern": "/api/admin/trr-api/social/shared/sources",
      "symbol": "PUT",
      "sourceFile": "src/app/api/admin/trr-api/social/shared/sources/route.ts",
      "sourceLocator": {
        "line": 26,
        "symbol": "PUT"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:app_api_route"
      ],
      "usageTier": "manual",
      "polls": false,
      "pollCadenceMs": null,
      "automatic": false,
      "loadsLargeDatasets": false,
      "usesPagination": false,
      "returnsWideRowsOrBlobsOrRawJson": false,
      "fansOutQueries": false,
      "postgresAccess": "none",
      "viewKinds": [],
      "staticOnly": false,
      "payloadRisk": "low",
      "fanoutRisk": "low"
    }
  ],
  "edges": [
    {
      "id": "contains_polling:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:poll:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::set-interval-1",
      "kind": "contains_polling",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "poll:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::set-interval-1",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 1410,
        "matchedText": "setInterval"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:setInterval"
      ]
    },
    {
      "id": "contains_polling:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:poll:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::set-interval-2",
      "kind": "contains_polling",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "poll:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::set-interval-2",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 7767,
        "matchedText": "setInterval"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:setInterval"
      ]
    },
    {
      "id": "contains_polling:component:src/components/admin/social-week/WeekDetailPageView.tsx::WeekDetailPage:poll:src/components/admin/social-week/WeekDetailPageView.tsx::set-interval-1",
      "kind": "contains_polling",
      "from": "component:src/components/admin/social-week/WeekDetailPageView.tsx::WeekDetailPage",
      "to": "poll:src/components/admin/social-week/WeekDetailPageView.tsx::set-interval-1",
      "title": null,
      "sourceFile": "src/components/admin/social-week/WeekDetailPageView.tsx",
      "sourceLocator": {
        "line": 7151,
        "matchedText": "setInterval"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:setInterval"
      ]
    },
    {
      "id": "contains_polling:component:src/components/admin/social-week/WeekDetailPageView.tsx::WeekDetailPage:poll:src/components/admin/social-week/WeekDetailPageView.tsx::set-interval-2",
      "kind": "contains_polling",
      "from": "component:src/components/admin/social-week/WeekDetailPageView.tsx::WeekDetailPage",
      "to": "poll:src/components/admin/social-week/WeekDetailPageView.tsx::set-interval-2",
      "title": null,
      "sourceFile": "src/components/admin/social-week/WeekDetailPageView.tsx",
      "sourceLocator": {
        "line": 7159,
        "matchedText": "setInterval"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:setInterval"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:GET:/api/admin/trr-api/people",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:GET:/api/admin/trr-api/people",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 2351,
        "matchedText": "`/api/admin/trr-api/people?q=${encodeURIComponent(trimmed)}&limit=8`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:GET:/api/admin/trr-api/people/[personId]/fandom",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:GET:/api/admin/trr-api/people/[personId]/fandom",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 5963,
        "matchedText": "`/api/admin/trr-api/people/${personId}/fandom${showIdQuery}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:PATCH:/api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:PATCH:/api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 2841,
        "matchedText": "`/api/admin/trr-api/people/${photo.person_id}/gallery/${photo.link_id}/facebank-seed`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/assets/archive",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:POST:/api/admin/trr-api/assets/archive",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 10104,
        "matchedText": "\"/api/admin/trr-api/assets/archive\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/assets/content-type",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:POST:/api/admin/trr-api/assets/content-type",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 10176,
        "matchedText": "\"/api/admin/trr-api/assets/content-type\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/assets/star",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:POST:/api/admin/trr-api/assets/star",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 10133,
        "matchedText": "\"/api/admin/trr-api/assets/star\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/cast-photos/[photoId]/mirror",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:POST:/api/admin/trr-api/cast-photos/[photoId]/mirror",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 2677,
        "matchedText": "`/api/admin/trr-api/cast-photos/${photo.id}/mirror`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/media-assets/[assetId]/mirror",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:POST:/api/admin/trr-api/media-assets/[assetId]/mirror",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 2802,
        "matchedText": "`/api/admin/trr-api/media-assets/${photo.media_asset_id}/mirror`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/people/[personId]/import-fandom/commit",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:POST:/api/admin/trr-api/people/[personId]/import-fandom/commit",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 6029,
        "matchedText": "`/api/admin/trr-api/people/${personId}/import-fandom/commit`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/people/[personId]/import-fandom/preview",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:POST:/api/admin/trr-api/people/[personId]/import-fandom/preview",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 5996,
        "matchedText": "`/api/admin/trr-api/people/${personId}/import-fandom/preview`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/people/[personId]/refresh-images",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:POST:/api/admin/trr-api/people/[personId]/refresh-images",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 7251,
        "matchedText": "`/api/admin/trr-api/people/${personId}/images/refresh`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:POST:/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 7617,
        "matchedText": "`/api/admin/trr-api/people/${personId}/refresh-images/getty-enrichment`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 7788,
        "matchedText": "`/api/admin/trr-api/people/${personId}/refresh-images/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 8809,
        "matchedText": "`/api/admin/trr-api/people/${personId}/reprocess-images/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:PUT:/api/admin/images/[imageType]/[imageId]/reassign",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:PUT:/api/admin/images/[imageType]/[imageId]/reassign",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 10054,
        "matchedText": "`/api/admin/images/cast/${reassignModalImage.imageId}/reassign`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:PUT:/api/admin/trr-api/people/[personId]/cover-photo",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:PUT:/api/admin/trr-api/people/[personId]/cover-photo",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 6582,
        "matchedText": "`/api/admin/trr-api/people/${personId}/cover-photo`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:PUT:/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop",
      "kind": "originates_request",
      "from": "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
      "to": "route:PUT:/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
      "sourceLocator": {
        "line": 2879,
        "matchedText": "`/api/admin/trr-api/people/${photo.person_id}/photos/${photo.id}/thumbnail-crop`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/AdminGlobalSearch.tsx::AdminGlobalSearch:route:GET:/api/admin/trr-api/search",
      "kind": "originates_request",
      "from": "component:src/components/admin/AdminGlobalSearch.tsx::AdminGlobalSearch",
      "to": "route:GET:/api/admin/trr-api/search",
      "title": null,
      "sourceFile": "src/components/admin/AdminGlobalSearch.tsx",
      "sourceLocator": {
        "line": 133,
        "matchedText": "`/api/admin/trr-api/search?q=${encodeURIComponent(trimmed)}&limit=8`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/BravotvImageRunPanel.tsx::BravotvImageRunPanel:route:GET:/api/admin/trr-api/bravotv/images/runs/[runId]/artifacts/[...artifactName]",
      "kind": "originates_request",
      "from": "component:src/components/admin/BravotvImageRunPanel.tsx::BravotvImageRunPanel",
      "to": "route:GET:/api/admin/trr-api/bravotv/images/runs/[runId]/artifacts/[...artifactName]",
      "title": null,
      "sourceFile": "src/components/admin/BravotvImageRunPanel.tsx",
      "sourceLocator": {
        "line": 119,
        "matchedText": "`/api/admin/trr-api/bravotv/images/runs/${runId}/artifacts/${artifactName}?offset=0&limit=10`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/design-system/BrandFontMatchesPanel.tsx::BrandFontMatchesPanel:route:GET:/api/admin/design-system/brand-font-matches",
      "kind": "originates_request",
      "from": "component:src/components/admin/design-system/BrandFontMatchesPanel.tsx::BrandFontMatchesPanel",
      "to": "route:GET:/api/admin/design-system/brand-font-matches",
      "title": null,
      "sourceFile": "src/components/admin/design-system/BrandFontMatchesPanel.tsx",
      "sourceLocator": {
        "line": 343,
        "matchedText": "\"/api/admin/design-system/brand-font-matches?refresh=1\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/design-system/DesignSystemPageClient.tsx::DesignSystemPageClient:route:GET:/api/admin/design-system/typography",
      "kind": "originates_request",
      "from": "component:src/components/admin/design-system/DesignSystemPageClient.tsx::DesignSystemPageClient",
      "to": "route:GET:/api/admin/design-system/typography",
      "title": null,
      "sourceFile": "src/components/admin/design-system/DesignSystemPageClient.tsx",
      "sourceLocator": {
        "line": 1831,
        "matchedText": "\"/api/admin/design-system/typography\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/GameProblemReports.tsx::GameProblemReports:route:GET:/api/admin/games/problem-reports",
      "kind": "originates_request",
      "from": "component:src/components/admin/GameProblemReports.tsx::GameProblemReports",
      "to": "route:GET:/api/admin/games/problem-reports",
      "title": null,
      "sourceFile": "src/components/admin/GameProblemReports.tsx",
      "sourceLocator": {
        "line": 32,
        "matchedText": "`/api/admin/games/problem-reports?game=${encodeURIComponent(gameKey)}&limit=${limit}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/image-lightbox/ReplaceGettyDrawer.tsx::ReplaceGettyDrawer:route:POST:/api/admin/trr-api/media-assets/[assetId]/replace-from-url",
      "kind": "originates_request",
      "from": "component:src/components/admin/image-lightbox/ReplaceGettyDrawer.tsx::ReplaceGettyDrawer",
      "to": "route:POST:/api/admin/trr-api/media-assets/[assetId]/replace-from-url",
      "title": null,
      "sourceFile": "src/components/admin/image-lightbox/ReplaceGettyDrawer.tsx",
      "sourceLocator": {
        "line": 57,
        "matchedText": "`/api/admin/trr-api/media-assets/${assetId}/replace-from-url`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/image-lightbox/ReplaceGettyDrawer.tsx::ReplaceGettyDrawer:route:POST:/api/admin/trr-api/media-assets/[assetId]/reverse-image-search",
      "kind": "originates_request",
      "from": "component:src/components/admin/image-lightbox/ReplaceGettyDrawer.tsx::ReplaceGettyDrawer",
      "to": "route:POST:/api/admin/trr-api/media-assets/[assetId]/reverse-image-search",
      "title": null,
      "sourceFile": "src/components/admin/image-lightbox/ReplaceGettyDrawer.tsx",
      "sourceLocator": {
        "line": 31,
        "matchedText": "`/api/admin/trr-api/media-assets/${assetId}/reverse-image-search`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/ImageScrapeDrawer.tsx::ImageScrapeDrawer:route:POST:/api/admin/scrape/import/stream",
      "kind": "originates_request",
      "from": "component:src/components/admin/ImageScrapeDrawer.tsx::ImageScrapeDrawer",
      "to": "route:POST:/api/admin/scrape/import/stream",
      "title": null,
      "sourceFile": "src/components/admin/ImageScrapeDrawer.tsx",
      "sourceLocator": {
        "line": 1144,
        "matchedText": "\"/api/admin/scrape/import/stream\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/NbcumvSeasonBios.tsx::NbcumvSeasonBios:route:GET:/api/admin/nbcumv/talent-bios",
      "kind": "originates_request",
      "from": "component:src/components/admin/NbcumvSeasonBios.tsx::NbcumvSeasonBios",
      "to": "route:GET:/api/admin/nbcumv/talent-bios",
      "title": null,
      "sourceFile": "src/components/admin/NbcumvSeasonBios.tsx",
      "sourceLocator": {
        "line": 74,
        "matchedText": "`/api/admin/nbcumv/talent-bios?${params}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/PeopleSearchMultiSelect.tsx::PeopleSearchMultiSelect:route:GET:/api/admin/trr-api/people",
      "kind": "originates_request",
      "from": "component:src/components/admin/PeopleSearchMultiSelect.tsx::PeopleSearchMultiSelect",
      "to": "route:GET:/api/admin/trr-api/people",
      "title": null,
      "sourceFile": "src/components/admin/PeopleSearchMultiSelect.tsx",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/api/admin/trr-api/people?q=${encodeURIComponent(trimmed)}&limit=${limit}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/social-posts-section.tsx::SocialPostsSection:route:DELETE:/api/admin/social-posts/[postId]",
      "kind": "originates_request",
      "from": "component:src/components/admin/social-posts-section.tsx::SocialPostsSection",
      "to": "route:DELETE:/api/admin/social-posts/[postId]",
      "title": null,
      "sourceFile": "src/components/admin/social-posts-section.tsx",
      "sourceLocator": {
        "line": 343,
        "matchedText": "`/api/admin/social-posts/${post.id}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/social-posts-section.tsx::SocialPostsSection:route:POST:/api/admin/trr-api/shows/[showId]/social-posts",
      "kind": "originates_request",
      "from": "component:src/components/admin/social-posts-section.tsx::SocialPostsSection",
      "to": "route:POST:/api/admin/trr-api/shows/[showId]/social-posts",
      "title": null,
      "sourceFile": "src/components/admin/social-posts-section.tsx",
      "sourceLocator": {
        "line": 298,
        "matchedText": "`/api/admin/trr-api/shows/${showId}/social-posts`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/social-posts-section.tsx::SocialPostsSection:route:PUT:/api/admin/social-posts/[postId]",
      "kind": "originates_request",
      "from": "component:src/components/admin/social-posts-section.tsx::SocialPostsSection",
      "to": "route:PUT:/api/admin/social-posts/[postId]",
      "title": null,
      "sourceFile": "src/components/admin/social-posts-section.tsx",
      "sourceLocator": {
        "line": 281,
        "matchedText": "`/api/admin/social-posts/${editingPost.id}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:component:src/components/admin/social-week/WeekDetailPageView.tsx::WeekDetailPage:route:GET:/api/admin/trr-api/shows/resolve-slug",
      "kind": "originates_request",
      "from": "component:src/components/admin/social-week/WeekDetailPageView.tsx::WeekDetailPage",
      "to": "route:GET:/api/admin/trr-api/shows/resolve-slug",
      "title": null,
      "sourceFile": "src/components/admin/social-week/WeekDetailPageView.tsx",
      "sourceLocator": {
        "line": 5078,
        "matchedText": "`/api/admin/trr-api/shows/resolve-slug?slug=${encodeURIComponent(raw)}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/games/flashback:route:DELETE:/api/admin/flashback/events/[eventId]",
      "kind": "originates_request",
      "from": "page:/admin/games/flashback",
      "to": "route:DELETE:/api/admin/flashback/events/[eventId]",
      "title": null,
      "sourceFile": "src/app/admin/games/flashback/page.tsx",
      "sourceLocator": {
        "line": 171,
        "matchedText": "`/api/admin/flashback/events/${encodeURIComponent(eventId)}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/reddit-window-posts:route:PATCH:/api/admin/reddit/post-matches",
      "kind": "originates_request",
      "from": "page:/admin/reddit-window-posts",
      "to": "route:PATCH:/api/admin/reddit/post-matches",
      "title": null,
      "sourceFile": "src/app/admin/reddit-window-posts/page.tsx",
      "sourceLocator": {
        "line": 1696,
        "matchedText": "\"/api/admin/reddit/post-matches\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/scrape-images:route:POST:/api/admin/scrape/import/stream",
      "kind": "originates_request",
      "from": "page:/admin/scrape-images",
      "to": "route:POST:/api/admin/scrape/import/stream",
      "title": null,
      "sourceFile": "src/app/admin/scrape-images/page.tsx",
      "sourceLocator": {
        "line": 771,
        "matchedText": "\"/api/admin/scrape/import/stream\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/survey-responses:route:GET:/api/admin/surveys",
      "kind": "originates_request",
      "from": "page:/admin/survey-responses",
      "to": "route:GET:/api/admin/surveys",
      "title": null,
      "sourceFile": "src/app/admin/survey-responses/page.tsx",
      "sourceLocator": {
        "line": 98,
        "matchedText": "\"/api/admin/surveys\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/survey-responses:route:GET:/api/admin/surveys/[surveyKey]/export",
      "kind": "originates_request",
      "from": "page:/admin/survey-responses",
      "to": "route:GET:/api/admin/surveys/[surveyKey]/export",
      "title": null,
      "sourceFile": "src/app/admin/survey-responses/page.tsx",
      "sourceLocator": {
        "line": 211,
        "matchedText": "`/api/admin/surveys/${selectedKey}/export?${params.toString()}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/survey-responses:route:GET:/api/admin/surveys/[surveyKey]/responses",
      "kind": "originates_request",
      "from": "page:/admin/survey-responses",
      "to": "route:GET:/api/admin/surveys/[surveyKey]/responses",
      "title": null,
      "sourceFile": "src/app/admin/survey-responses/page.tsx",
      "sourceLocator": {
        "line": 149,
        "matchedText": "`/api/admin/surveys/${selectedKey}/responses?${params.toString()}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/survey-responses:route:GET:/api/admin/surveys/[surveyKey]/responses/[responseId]",
      "kind": "originates_request",
      "from": "page:/admin/survey-responses",
      "to": "route:GET:/api/admin/surveys/[surveyKey]/responses/[responseId]",
      "title": null,
      "sourceFile": "src/app/admin/survey-responses/page.tsx",
      "sourceLocator": {
        "line": 180,
        "matchedText": "`/api/admin/surveys/${selectedKey}/responses/${responseId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/people/[personId]/refresh-images",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]",
      "to": "route:POST:/api/admin/trr-api/people/[personId]/refresh-images",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/page.tsx",
      "sourceLocator": {
        "line": 3856,
        "matchedText": "`/api/admin/trr-api/people/${personId}/refresh-images`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]",
      "to": "route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/page.tsx",
      "sourceLocator": {
        "line": 3770,
        "matchedText": "`/api/admin/trr-api/people/${personId}/refresh-images/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/people/[personId]/refresh-profile/stream",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]",
      "to": "route:POST:/api/admin/trr-api/people/[personId]/refresh-profile/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/page.tsx",
      "sourceLocator": {
        "line": 3567,
        "matchedText": "`/api/admin/trr-api/people/${personId}/refresh-profile/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]",
      "to": "route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/page.tsx",
      "sourceLocator": {
        "line": 3940,
        "matchedText": "`/api/admin/trr-api/people/${personId}/reprocess-images/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]",
      "to": "route:POST:/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/page.tsx",
      "sourceLocator": {
        "line": 9758,
        "matchedText": "`/api/admin/trr-api/shows/${showId}/assets/batch-jobs/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]",
      "to": "route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/page.tsx",
      "sourceLocator": {
        "line": 6779,
        "matchedText": "`/api/admin/trr-api/shows/${showId}/import-bravo/preview/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/shows/[showId]/refresh/stream",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]",
      "to": "route:POST:/api/admin/trr-api/shows/[showId]/refresh/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/page.tsx",
      "sourceLocator": {
        "line": 10718,
        "matchedText": "`/api/admin/trr-api/shows/${showId}/refresh/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:DELETE:/api/admin/trr-api/media-assets/[assetId]",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:DELETE:/api/admin/trr-api/media-assets/[assetId]",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 4058,
        "matchedText": "`/api/admin/trr-api/media-assets/${assetId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/seasons/[seasonId]/episodes",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:GET:/api/admin/trr-api/seasons/[seasonId]/episodes",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 2134,
        "matchedText": "`/api/admin/trr-api/seasons/${foundSeason.id}/episodes?limit=500`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/seasons/[seasonId]/unassigned-backdrops",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:GET:/api/admin/trr-api/seasons/[seasonId]/unassigned-backdrops",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 3757,
        "matchedText": "`/api/admin/trr-api/seasons/${season.id}/unassigned-backdrops`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/[showId]",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:GET:/api/admin/trr-api/shows/[showId]",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 2086,
        "matchedText": "`/api/admin/trr-api/shows/${requestShowId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/[showId]/cast",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:GET:/api/admin/trr-api/shows/[showId]/cast",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 1687,
        "matchedText": "`/api/admin/trr-api/shows/${showId}/cast?limit=500&photo_fallback=none&exclude_zero_episode_members=1`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/[showId]/credits",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:GET:/api/admin/trr-api/shows/[showId]/credits",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 1716,
        "matchedText": "`/api/admin/trr-api/shows/${showId}/credits`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/[showId]/seasons",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:GET:/api/admin/trr-api/shows/[showId]/seasons",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 2087,
        "matchedText": "`/api/admin/trr-api/shows/${requestShowId}/seasons?limit=50`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 2135,
        "matchedText": "`/api/admin/trr-api/shows/${requestShowId}/seasons/${requestSeasonNumber}/cast?limit=500&include_archive_only=true`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 1979,
        "matchedText": "`/api/admin/trr-api/shows/${requestShowId}/seasons/${requestSeasonNumber}/fandom`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/resolve-slug",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:GET:/api/admin/trr-api/shows/resolve-slug",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 1533,
        "matchedText": "`/api/admin/trr-api/shows/resolve-slug?slug=${encodeURIComponent(raw)}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/assets/archive",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:POST:/api/admin/trr-api/assets/archive",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 4077,
        "matchedText": "\"/api/admin/trr-api/assets/archive\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/assets/content-type",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:POST:/api/admin/trr-api/assets/content-type",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 4179,
        "matchedText": "\"/api/admin/trr-api/assets/content-type\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/assets/star",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:POST:/api/admin/trr-api/assets/star",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 4143,
        "matchedText": "\"/api/admin/trr-api/assets/star\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/media-assets/[assetId]/detect-text-overlay",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:POST:/api/admin/trr-api/media-assets/[assetId]/detect-text-overlay",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 4711,
        "matchedText": "`/api/admin/trr-api/media-assets/${asset.id}/detect-text-overlay`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 3286,
        "matchedText": "`/api/admin/trr-api/people/${personId}/refresh-images/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 3395,
        "matchedText": "`/api/admin/trr-api/people/${personId}/reprocess-images/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/seasons/[seasonId]/assign-backdrops",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:POST:/api/admin/trr-api/seasons/[seasonId]/assign-backdrops",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 3789,
        "matchedText": "`/api/admin/trr-api/seasons/${season.id}/assign-backdrops`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/shows/[showId]/refresh-photos/stream",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:POST:/api/admin/trr-api/shows/[showId]/refresh-photos/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 2629,
        "matchedText": "`/api/admin/trr-api/shows/${showId}/refresh-photos/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/shows/[showId]/refresh/stream",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:POST:/api/admin/trr-api/shows/[showId]/refresh/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 2912,
        "matchedText": "`/api/admin/trr-api/shows/${showId}/refresh/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 2480,
        "matchedText": "`/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/assets/batch-jobs/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 2042,
        "matchedText": "`/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/import-fandom/commit`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
      "kind": "originates_request",
      "from": "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
      "to": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
      "title": null,
      "sourceFile": "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      "sourceLocator": {
        "line": 2009,
        "matchedText": "`/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/import-fandom/preview`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:ui_request_call"
      ]
    },
    {
      "id": "proxies_to:route:DELETE:/api/admin/covered-shows/[showId]:backend:DELETE:/api/v1/admin/covered-shows/[showId]",
      "kind": "proxies_to",
      "from": "route:DELETE:/api/admin/covered-shows/[showId]",
      "to": "backend:DELETE:/api/v1/admin/covered-shows/[showId]",
      "title": null,
      "sourceFile": "src/app/api/admin/covered-shows/[showId]/route.ts",
      "sourceLocator": {
        "line": 149,
        "matchedText": "`/admin/covered-shows/${showId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:DELETE:/api/admin/networks-streaming/overrides/[id]:backend:DELETE:/api/v1/admin/shows/networks-streaming/overrides/[id]",
      "kind": "proxies_to",
      "from": "route:DELETE:/api/admin/networks-streaming/overrides/[id]",
      "to": "backend:DELETE:/api/v1/admin/shows/networks-streaming/overrides/[id]",
      "title": null,
      "sourceFile": "src/app/api/admin/networks-streaming/overrides/[id]/route.ts",
      "sourceLocator": {
        "line": 111,
        "matchedText": "`/admin/shows/networks-streaming/overrides/${params.id}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:DELETE:/api/admin/social-posts/[postId]:backend:DELETE:/api/v1/admin/social-posts/[postId]",
      "kind": "proxies_to",
      "from": "route:DELETE:/api/admin/social-posts/[postId]",
      "to": "backend:DELETE:/api/v1/admin/social-posts/[postId]",
      "title": null,
      "sourceFile": "src/app/api/admin/social-posts/[postId]/route.ts",
      "sourceLocator": {
        "line": 183,
        "matchedText": "`/admin/social-posts/${postId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:DELETE:/api/admin/trr-api/brands/logos/options/saved/[assetId]:backend:DELETE:/api/v1/admin/brands/logos/options/saved/[assetId]",
      "kind": "proxies_to",
      "from": "route:DELETE:/api/admin/trr-api/brands/logos/options/saved/[assetId]",
      "to": "backend:DELETE:/api/v1/admin/brands/logos/options/saved/[assetId]",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/saved/[assetId]/route.ts",
      "sourceLocator": {
        "line": 22,
        "matchedText": "`/admin/brands/logos/options/saved/${encodeURIComponent((await context.params).assetId)}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:DELETE:/api/admin/trr-api/media-assets/[assetId]:backend:DELETE:/api/v1/admin/media-assets/[assetId]",
      "kind": "proxies_to",
      "from": "route:DELETE:/api/admin/trr-api/media-assets/[assetId]",
      "to": "backend:DELETE:/api/v1/admin/media-assets/[assetId]",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/route.ts",
      "sourceLocator": {
        "line": 26,
        "matchedText": "`/admin/media-assets/${assetId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:DELETE:/api/admin/trr-api/shows/[showId]/links/[linkId]:backend:DELETE:/api/v1/admin/shows/[showId]/links/[linkId]",
      "kind": "proxies_to",
      "from": "route:DELETE:/api/admin/trr-api/shows/[showId]/links/[linkId]",
      "to": "backend:DELETE:/api/v1/admin/shows/[showId]/links/[linkId]",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/[linkId]/route.ts",
      "sourceLocator": {
        "line": 63,
        "matchedText": "`/admin/shows/${showId}/links/${linkId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/covered-shows/[showId]:backend:GET:/api/v1/admin/covered-shows/[showId]",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/covered-shows/[showId]",
      "to": "backend:GET:/api/v1/admin/covered-shows/[showId]",
      "title": null,
      "sourceFile": "src/app/api/admin/covered-shows/[showId]/route.ts",
      "sourceLocator": {
        "line": 149,
        "matchedText": "`/admin/covered-shows/${showId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/networks-streaming/overrides:backend:GET:/api/v1/admin/shows/networks-streaming/overrides",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/networks-streaming/overrides",
      "to": "backend:GET:/api/v1/admin/shows/networks-streaming/overrides",
      "title": null,
      "sourceFile": "src/app/api/admin/networks-streaming/overrides/route.ts",
      "sourceLocator": {
        "line": 106,
        "matchedText": "\"/admin/shows/networks-streaming/overrides\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/shows/[showKey]/icons:backend:GET:/api/v1/admin/shows/[showKey]/icons",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/shows/[showKey]/icons",
      "to": "backend:GET:/api/v1/admin/shows/[showKey]/icons",
      "title": null,
      "sourceFile": "src/app/api/admin/shows/[showKey]/icons/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/shows/${encodeURIComponent(showKey)}/icons`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/social-posts/[postId]:backend:GET:/api/v1/admin/social-posts/[postId]",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/social-posts/[postId]",
      "to": "backend:GET:/api/v1/admin/social-posts/[postId]",
      "title": null,
      "sourceFile": "src/app/api/admin/social-posts/[postId]/route.ts",
      "sourceLocator": {
        "line": 183,
        "matchedText": "`/admin/social-posts/${postId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/brands/families:backend:GET:/api/v1/admin/brands/families",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/brands/families",
      "to": "backend:GET:/api/v1/admin/brands/families",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/families/route.ts",
      "sourceLocator": {
        "line": 52,
        "matchedText": "\"/admin/brands/families\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/brands/families/[familyId]/links:backend:GET:/api/v1/admin/brands/families/[familyId]/links",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/brands/families/[familyId]/links",
      "to": "backend:GET:/api/v1/admin/brands/families/[familyId]/links",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/links/route.ts",
      "sourceLocator": {
        "line": 55,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/links`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/brands/families/[familyId]/wikipedia-show-urls:backend:GET:/api/v1/admin/brands/families/[familyId]/wikipedia-show-urls",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/brands/families/[familyId]/wikipedia-show-urls",
      "to": "backend:GET:/api/v1/admin/brands/families/[familyId]/wikipedia-show-urls",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/wikipedia-show-urls/route.ts",
      "sourceLocator": {
        "line": 16,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/wikipedia-show-urls`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/brands/families/by-entity:backend:GET:/api/v1/admin/brands/families/by-entity",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/brands/families/by-entity",
      "to": "backend:GET:/api/v1/admin/brands/families/by-entity",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/families/by-entity/route.ts",
      "sourceLocator": {
        "line": 11,
        "matchedText": "\"/admin/brands/families/by-entity\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/brands/families/suggestions:backend:GET:/api/v1/admin/brands/families/suggestions",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/brands/families/suggestions",
      "to": "backend:GET:/api/v1/admin/brands/families/suggestions",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/families/suggestions/route.ts",
      "sourceLocator": {
        "line": 11,
        "matchedText": "\"/admin/brands/families/suggestions\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/brands/franchise-rules:backend:GET:/api/v1/admin/brands/franchise-rules",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/brands/franchise-rules",
      "to": "backend:GET:/api/v1/admin/brands/franchise-rules",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/franchise-rules/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "\"/admin/brands/franchise-rules\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/brands/logo-targets:backend:GET:/api/v1/admin/brands/logo-targets",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/brands/logo-targets",
      "to": "backend:GET:/api/v1/admin/brands/logo-targets",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/logo-targets/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logo-targets\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/brands/logos/options/modal:backend:GET:/api/v1/admin/brands/logos/options/modal",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/brands/logos/options/modal",
      "to": "backend:GET:/api/v1/admin/brands/logos/options/modal",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/modal/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/modal\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/brands/logos/options/source-suggestions:backend:GET:/api/v1/admin/brands/logos/options/source-suggestions",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/brands/logos/options/source-suggestions",
      "to": "backend:GET:/api/v1/admin/brands/logos/options/source-suggestions",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/source-suggestions/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/source-suggestions\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/brands/logos/options/sources:backend:GET:/api/v1/admin/brands/logos/options/sources",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/brands/logos/options/sources",
      "to": "backend:GET:/api/v1/admin/brands/logos/options/sources",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/sources/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/sources\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/bravotv/images/people/[personId]/latest:backend:GET:/api/v1/admin/bravotv/images/people/[personId]/latest",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/bravotv/images/people/[personId]/latest",
      "to": "backend:GET:/api/v1/admin/bravotv/images/people/[personId]/latest",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/people/[personId]/latest/route.ts",
      "sourceLocator": {
        "line": 13,
        "matchedText": "`/admin/bravotv/images/people/${personId}/latest`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/bravotv/images/shows/[showId]/latest:backend:GET:/api/v1/admin/bravotv/images/shows/[showId]/latest",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/bravotv/images/shows/[showId]/latest",
      "to": "backend:GET:/api/v1/admin/bravotv/images/shows/[showId]/latest",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/shows/[showId]/latest/route.ts",
      "sourceLocator": {
        "line": 13,
        "matchedText": "`/admin/bravotv/images/shows/${showId}/latest`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/operations/[operationId]:backend:GET:/api/v1/admin/operations/[operationId]",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/operations/[operationId]",
      "to": "backend:GET:/api/v1/admin/operations/[operationId]",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/operations/[operationId]/route.ts",
      "sourceLocator": {
        "line": 26,
        "matchedText": "`/admin/operations/${operationId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/operations/[operationId]/stream:backend:GET:/api/v1/admin/operations/[operationId]/stream",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/operations/[operationId]/stream",
      "to": "backend:GET:/api/v1/admin/operations/[operationId]/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/operations/[operationId]/stream/route.ts",
      "sourceLocator": {
        "line": 35,
        "matchedText": "`/admin/operations/${operationId}/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/operations/health:backend:GET:/api/v1/admin/operations/health",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/operations/health",
      "to": "backend:GET:/api/v1/admin/operations/health",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/operations/health/route.ts",
      "sourceLocator": {
        "line": 14,
        "matchedText": "\"/admin/operations/health\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/people/[personId]/fandom:backend:GET:/api/v1/admin/person/[personId]/fandom",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/people/[personId]/fandom",
      "to": "backend:GET:/api/v1/admin/person/[personId]/fandom",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/fandom/route.ts",
      "sourceLocator": {
        "line": 31,
        "matchedText": "`/admin/person/${personId}/fandom`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/people/[personId]/social-growth:backend:GET:/api/v1/admin/people/[personId]/socialblade",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/people/[personId]/social-growth",
      "to": "backend:GET:/api/v1/admin/people/[personId]/socialblade",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/social-growth/route.ts",
      "sourceLocator": {
        "line": 37,
        "matchedText": "`/admin/people/${personId}/socialblade?handle=${encodeURIComponent(handle)}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/bravo/news:backend:GET:/api/v1/admin/shows/[showId]/bravo/news",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/shows/[showId]/bravo/news",
      "to": "backend:GET:/api/v1/admin/shows/[showId]/bravo/news",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/bravo/news/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/shows/${showId}/bravo/news`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/bravo/videos:backend:GET:/api/v1/admin/shows/[showId]/bravo/videos",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/shows/[showId]/bravo/videos",
      "to": "backend:GET:/api/v1/admin/shows/[showId]/bravo/videos",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/bravo/videos/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/shows/${showId}/bravo/videos`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/cast-role-members:backend:GET:/api/v1/admin/shows/[showId]/cast-role-members",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/shows/[showId]/cast-role-members",
      "to": "backend:GET:/api/v1/admin/shows/[showId]/cast-role-members",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/cast-role-members/route.ts",
      "sourceLocator": {
        "line": 84,
        "matchedText": "`/admin/shows/${showId}/cast-role-members`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]:backend:GET:/api/v1/admin/shows/[showId]/google-news/sync/[jobId]",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]",
      "to": "backend:GET:/api/v1/admin/shows/[showId]/google-news/sync/[jobId]",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]/route.ts",
      "sourceLocator": {
        "line": 53,
        "matchedText": "`/admin/shows/${showId}/google-news/sync/${jobId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/links:backend:GET:/api/v1/admin/shows/[showId]/links",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/shows/[showId]/links",
      "to": "backend:GET:/api/v1/admin/shows/[showId]/links",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/route.ts",
      "sourceLocator": {
        "line": 47,
        "matchedText": "`/admin/shows/${showId}/links`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/news:backend:GET:/api/v1/admin/shows/[showId]/news",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/shows/[showId]/news",
      "to": "backend:GET:/api/v1/admin/shows/[showId]/news",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/news/route.ts",
      "sourceLocator": {
        "line": 48,
        "matchedText": "`/admin/shows/${showId}/news`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/roles:backend:GET:/api/v1/admin/shows/[showId]/roles",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/shows/[showId]/roles",
      "to": "backend:GET:/api/v1/admin/shows/[showId]/roles",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/roles/route.ts",
      "sourceLocator": {
        "line": 218,
        "matchedText": "`/admin/shows/${showId}/roles`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom:backend:GET:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/fandom",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom",
      "to": "backend:GET:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/fandom",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/shows/${showId}/seasons/${seasonNumber}/fandom`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:GET:/api/admin/trr-api/social/ingest/live-status/stream:backend:GET:/api/v1/admin/socials/live-status/stream",
      "kind": "proxies_to",
      "from": "route:GET:/api/admin/trr-api/social/ingest/live-status/stream",
      "to": "backend:GET:/api/v1/admin/socials/live-status/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/social/ingest/live-status/stream/route.ts",
      "sourceLocator": {
        "line": 11,
        "matchedText": "\"/admin/socials/live-status/stream\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:PATCH:/api/admin/networks-streaming/overrides/[id]:backend:PATCH:/api/v1/admin/shows/networks-streaming/overrides/[id]",
      "kind": "proxies_to",
      "from": "route:PATCH:/api/admin/networks-streaming/overrides/[id]",
      "to": "backend:PATCH:/api/v1/admin/shows/networks-streaming/overrides/[id]",
      "title": null,
      "sourceFile": "src/app/api/admin/networks-streaming/overrides/[id]/route.ts",
      "sourceLocator": {
        "line": 111,
        "matchedText": "`/admin/shows/networks-streaming/overrides/${params.id}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:PATCH:/api/admin/trr-api/brands/families/[familyId]:backend:PATCH:/api/v1/admin/brands/families/[familyId]",
      "kind": "proxies_to",
      "from": "route:PATCH:/api/admin/trr-api/brands/families/[familyId]",
      "to": "backend:PATCH:/api/v1/admin/brands/families/[familyId]",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/route.ts",
      "sourceLocator": {
        "line": 16,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:PATCH:/api/admin/trr-api/brands/families/[familyId]/links/[ruleId]:backend:PATCH:/api/v1/admin/brands/families/[familyId]/links/[ruleId]`,\n    );\n    if (!backendUrl) return NextResponse.json({ error: \"Backend API not configured\" }, { status: 500 });\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) return NextResponse.json({ error: \"Backend auth not configured\" }, { status: 500 });\n\n    const body =\n      request.headers.get(\"content-type",
      "kind": "proxies_to",
      "from": "route:PATCH:/api/admin/trr-api/brands/families/[familyId]/links/[ruleId]",
      "to": "backend:PATCH:/api/v1/admin/brands/families/[familyId]/links/[ruleId]`,\n    );\n    if (!backendUrl) return NextResponse.json({ error: \"Backend API not configured\" }, { status: 500 });\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) return NextResponse.json({ error: \"Backend auth not configured\" }, { status: 500 });\n\n    const body =\n      request.headers.get(\"content-type",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/links/[ruleId]/route.ts",
      "sourceLocator": {
        "line": 16,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/links/${encodeURIComponent(ruleId)}`,\n    );\n    if (!backendUrl) return NextResponse.json({ error: \"Backend API not configured\" }, { status: 500 });\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) return NextResponse.json({ error: \"Backend auth not configured\" }, { status: 500 });\n\n    const body =\n      request.headers.get(\"content-type\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:PATCH:/api/admin/trr-api/shows/[showId]/links/[linkId]:backend:PATCH:/api/v1/admin/shows/[showId]/links/[linkId]",
      "kind": "proxies_to",
      "from": "route:PATCH:/api/admin/trr-api/shows/[showId]/links/[linkId]",
      "to": "backend:PATCH:/api/v1/admin/shows/[showId]/links/[linkId]",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/[linkId]/route.ts",
      "sourceLocator": {
        "line": 63,
        "matchedText": "`/admin/shows/${showId}/links/${linkId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:PATCH:/api/admin/trr-api/shows/[showId]/roles/[roleId]:backend:PATCH:/api/v1/admin/shows/[showId]/roles/[roleId]",
      "kind": "proxies_to",
      "from": "route:PATCH:/api/admin/trr-api/shows/[showId]/roles/[roleId]",
      "to": "backend:PATCH:/api/v1/admin/shows/[showId]/roles/[roleId]",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/roles/[roleId]/route.ts",
      "sourceLocator": {
        "line": 22,
        "matchedText": "`/admin/shows/${showId}/roles/${roleId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/networks-streaming/overrides:backend:POST:/api/v1/admin/shows/networks-streaming/overrides",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/networks-streaming/overrides",
      "to": "backend:POST:/api/v1/admin/shows/networks-streaming/overrides",
      "title": null,
      "sourceFile": "src/app/api/admin/networks-streaming/overrides/route.ts",
      "sourceLocator": {
        "line": 106,
        "matchedText": "\"/admin/shows/networks-streaming/overrides\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/networks-streaming/sync:backend:POST:/api/v1/admin/shows/sync-networks-streaming",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/networks-streaming/sync",
      "to": "backend:POST:/api/v1/admin/shows/sync-networks-streaming",
      "title": null,
      "sourceFile": "src/app/api/admin/networks-streaming/sync/route.ts",
      "sourceLocator": {
        "line": 109,
        "matchedText": "\"/admin/shows/sync-networks-streaming\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/scrape/import:backend:POST:/api/v1/admin/scrape/import",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/scrape/import",
      "to": "backend:POST:/api/v1/admin/scrape/import",
      "title": null,
      "sourceFile": "src/app/api/admin/scrape/import/route.ts",
      "sourceLocator": {
        "line": 79,
        "matchedText": "\"/admin/scrape/import\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/scrape/import/stream:backend:POST:/api/v1/admin/scrape/import/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/scrape/import/stream",
      "to": "backend:POST:/api/v1/admin/scrape/import/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/scrape/import/stream/route.ts",
      "sourceLocator": {
        "line": 105,
        "matchedText": "\"/admin/scrape/import/stream\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/scrape/preview:backend:POST:/api/v1/admin/scrape/preview",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/scrape/preview",
      "to": "backend:POST:/api/v1/admin/scrape/preview",
      "title": null,
      "sourceFile": "src/app/api/admin/scrape/preview/route.ts",
      "sourceLocator": {
        "line": 41,
        "matchedText": "\"/admin/scrape/preview\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/shows/[showKey]/icons:backend:POST:/api/v1/admin/shows/[showKey]/icons",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/shows/[showKey]/icons",
      "to": "backend:POST:/api/v1/admin/shows/[showKey]/icons",
      "title": null,
      "sourceFile": "src/app/api/admin/shows/[showKey]/icons/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/shows/${encodeURIComponent(showKey)}/icons`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/assets/archive:backend:POST:/api/v1/admin/assets/archive",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/assets/archive",
      "to": "backend:POST:/api/v1/admin/assets/archive",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/assets/archive/route.ts",
      "sourceLocator": {
        "line": 17,
        "matchedText": "\"/admin/assets/archive\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/assets/content-type:backend:POST:/api/v1/admin/assets/content-type",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/assets/content-type",
      "to": "backend:POST:/api/v1/admin/assets/content-type",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/assets/content-type/route.ts",
      "sourceLocator": {
        "line": 17,
        "matchedText": "\"/admin/assets/content-type\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/assets/star:backend:POST:/api/v1/admin/assets/star",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/assets/star",
      "to": "backend:POST:/api/v1/admin/assets/star",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/assets/star/route.ts",
      "sourceLocator": {
        "line": 17,
        "matchedText": "\"/admin/assets/star\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/brands/families:backend:POST:/api/v1/admin/brands/families",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/brands/families",
      "to": "backend:POST:/api/v1/admin/brands/families",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/families/route.ts",
      "sourceLocator": {
        "line": 52,
        "matchedText": "\"/admin/brands/families\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/brands/families/[familyId]/links:backend:POST:/api/v1/admin/brands/families/[familyId]/links",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/brands/families/[familyId]/links",
      "to": "backend:POST:/api/v1/admin/brands/families/[familyId]/links",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/links/route.ts",
      "sourceLocator": {
        "line": 55,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/links`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/brands/families/[familyId]/links/apply:backend:POST:/api/v1/admin/brands/families/[familyId]/links/apply",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/brands/families/[familyId]/links/apply",
      "to": "backend:POST:/api/v1/admin/brands/families/[familyId]/links/apply",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/links/apply/route.ts",
      "sourceLocator": {
        "line": 16,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/links/apply`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/brands/families/[familyId]/members:backend:POST:/api/v1/admin/brands/families/[familyId]/members",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/brands/families/[familyId]/members",
      "to": "backend:POST:/api/v1/admin/brands/families/[familyId]/members",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/members/route.ts",
      "sourceLocator": {
        "line": 16,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/members`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/brands/families/[familyId]/wikipedia-import:backend:POST:/api/v1/admin/brands/families/[familyId]/wikipedia-import",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/brands/families/[familyId]/wikipedia-import",
      "to": "backend:POST:/api/v1/admin/brands/families/[familyId]/wikipedia-import",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/families/[familyId]/wikipedia-import/route.ts",
      "sourceLocator": {
        "line": 16,
        "matchedText": "`/admin/brands/families/${encodeURIComponent(familyId)}/wikipedia-import`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/apply:backend:POST:/api/v1/admin/brands/franchise-rules/[franchiseKey]/apply",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/apply",
      "to": "backend:POST:/api/v1/admin/brands/franchise-rules/[franchiseKey]/apply",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/apply/route.ts",
      "sourceLocator": {
        "line": 25,
        "matchedText": "`/admin/brands/franchise-rules/${encodeURIComponent(franchiseKey)}/apply`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/brands/logos/options/assign:backend:POST:/api/v1/admin/brands/logos/options/assign",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/brands/logos/options/assign",
      "to": "backend:POST:/api/v1/admin/brands/logos/options/assign",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/assign/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/assign\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/brands/logos/options/discover:backend:POST:/api/v1/admin/brands/logos/options/discover",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/brands/logos/options/discover",
      "to": "backend:POST:/api/v1/admin/brands/logos/options/discover",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/discover/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/discover\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/brands/logos/options/select:backend:POST:/api/v1/admin/brands/logos/options/select",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/brands/logos/options/select",
      "to": "backend:POST:/api/v1/admin/brands/logos/options/select",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/select/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/select\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/brands/logos/options/source-query:backend:POST:/api/v1/admin/brands/logos/options/source-query",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/brands/logos/options/source-query",
      "to": "backend:POST:/api/v1/admin/brands/logos/options/source-query",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/options/source-query/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/options/source-query\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/brands/logos/sync:backend:POST:/api/v1/admin/brands/logos/sync",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/brands/logos/sync",
      "to": "backend:POST:/api/v1/admin/brands/logos/sync",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/logos/sync/route.ts",
      "sourceLocator": {
        "line": 19,
        "matchedText": "\"/admin/brands/logos/sync\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/bravotv/images/people/[personId]/stream:backend:POST:/api/v1/admin/bravotv/images/people/[personId]/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/bravotv/images/people/[personId]/stream",
      "to": "backend:POST:/api/v1/admin/bravotv/images/people/[personId]/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/people/[personId]/stream/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/bravotv/images/people/${personId}/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/bravotv/images/shows/[showId]/stream:backend:POST:/api/v1/admin/bravotv/images/shows/[showId]/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/bravotv/images/shows/[showId]/stream",
      "to": "backend:POST:/api/v1/admin/bravotv/images/shows/[showId]/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/bravotv/images/shows/[showId]/stream/route.ts",
      "sourceLocator": {
        "line": 20,
        "matchedText": "`/admin/bravotv/images/shows/${showId}/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/cast-photos/[photoId]/auto-count:backend:POST:/api/v1/admin/cast-photos/[photoId]/auto-count",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/cast-photos/[photoId]/auto-count",
      "to": "backend:POST:/api/v1/admin/cast-photos/[photoId]/auto-count",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/auto-count/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/cast-photos/${photoId}/auto-count`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/cast-photos/[photoId]/detect-text-overlay:backend:POST:/api/v1/admin/cast-photos/[photoId]/detect-text-overlay",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/cast-photos/[photoId]/detect-text-overlay",
      "to": "backend:POST:/api/v1/admin/cast-photos/[photoId]/detect-text-overlay",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/detect-text-overlay/route.ts",
      "sourceLocator": {
        "line": 47,
        "matchedText": "`/admin/cast-photos/${photoId}/detect-text-overlay`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/cast-photos/[photoId]/mirror:backend:POST:/api/v1/admin/cast-photos/[photoId]/mirror",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/cast-photos/[photoId]/mirror",
      "to": "backend:POST:/api/v1/admin/cast-photos/[photoId]/mirror",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/mirror/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/cast-photos/${photoId}/mirror`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/cast-photos/[photoId]/variants:backend:POST:/api/v1/admin/cast-photos/[photoId]/variants",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/cast-photos/[photoId]/variants",
      "to": "backend:POST:/api/v1/admin/cast-photos/[photoId]/variants",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/cast-photos/[photoId]/variants/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/cast-photos/${photoId}/variants`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/media-assets/[assetId]/auto-count:backend:POST:/api/v1/admin/media-assets/[assetId]/auto-count",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/media-assets/[assetId]/auto-count",
      "to": "backend:POST:/api/v1/admin/media-assets/[assetId]/auto-count",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/auto-count/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/media-assets/${assetId}/auto-count`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/media-assets/[assetId]/detect-text-overlay:backend:POST:/api/v1/admin/media-assets/[assetId]/detect-text-overlay",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/media-assets/[assetId]/detect-text-overlay",
      "to": "backend:POST:/api/v1/admin/media-assets/[assetId]/detect-text-overlay",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/detect-text-overlay/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/media-assets/${assetId}/detect-text-overlay`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/media-assets/[assetId]/mirror:backend:POST:/api/v1/admin/media-assets/[assetId]/mirror",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/media-assets/[assetId]/mirror",
      "to": "backend:POST:/api/v1/admin/media-assets/[assetId]/mirror",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/mirror/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/media-assets/${assetId}/mirror`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/media-assets/[assetId]/replace-from-url:backend:POST:/api/v1/admin/media-assets/[assetId]/replace-from-url",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/media-assets/[assetId]/replace-from-url",
      "to": "backend:POST:/api/v1/admin/media-assets/[assetId]/replace-from-url",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/replace-from-url/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/media-assets/${assetId}/replace-from-url`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/media-assets/[assetId]/reverse-image-search:backend:POST:/api/v1/admin/media-assets/[assetId]/reverse-image-search",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/media-assets/[assetId]/reverse-image-search",
      "to": "backend:POST:/api/v1/admin/media-assets/[assetId]/reverse-image-search",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/reverse-image-search/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/media-assets/${assetId}/reverse-image-search`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/media-assets/[assetId]/variants:backend:POST:/api/v1/admin/media-assets/[assetId]/variants",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/media-assets/[assetId]/variants",
      "to": "backend:POST:/api/v1/admin/media-assets/[assetId]/variants",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/media-assets/[assetId]/variants/route.ts",
      "sourceLocator": {
        "line": 44,
        "matchedText": "`/admin/media-assets/${assetId}/variants`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/operations/[operationId]/cancel:backend:POST:/api/v1/admin/operations/[operationId]/cancel",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/operations/[operationId]/cancel",
      "to": "backend:POST:/api/v1/admin/operations/[operationId]/cancel",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/operations/[operationId]/cancel/route.ts",
      "sourceLocator": {
        "line": 26,
        "matchedText": "`/admin/operations/${operationId}/cancel`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/operations/cancel:backend:POST:/api/v1/admin/operations/cancel",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/operations/cancel",
      "to": "backend:POST:/api/v1/admin/operations/cancel",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/operations/cancel/route.ts",
      "sourceLocator": {
        "line": 13,
        "matchedText": "\"/admin/operations/cancel\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/operations/stale/cancel:backend:POST:/api/v1/admin/operations/stale/cancel",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/operations/stale/cancel",
      "to": "backend:POST:/api/v1/admin/operations/stale/cancel",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/operations/stale/cancel/route.ts",
      "sourceLocator": {
        "line": 12,
        "matchedText": "\"/admin/operations/stale/cancel\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/import-fandom/commit:backend:POST:/api/v1/admin/person/[personId]/import-fandom/commit",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/people/[personId]/import-fandom/commit",
      "to": "backend:POST:/api/v1/admin/person/[personId]/import-fandom/commit",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/import-fandom/commit/route.ts",
      "sourceLocator": {
        "line": 27,
        "matchedText": "`/admin/person/${personId}/import-fandom/commit`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/import-fandom/preview:backend:POST:/api/v1/admin/person/[personId]/import-fandom/preview",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/people/[personId]/import-fandom/preview",
      "to": "backend:POST:/api/v1/admin/person/[personId]/import-fandom/preview",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/import-fandom/preview/route.ts",
      "sourceLocator": {
        "line": 24,
        "matchedText": "`/admin/person/${personId}/import-fandom/preview`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/refresh-images:backend:POST:/api/v1/admin/person/[personId]/refresh-images",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/people/[personId]/refresh-images",
      "to": "backend:POST:/api/v1/admin/person/[personId]/refresh-images",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/refresh-images/route.ts",
      "sourceLocator": {
        "line": 88,
        "matchedText": "`/admin/person/${personId}/refresh-images`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment:backend:POST:/api/v1/admin/person/[personId]/refresh-images/getty-enrichment",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment",
      "to": "backend:POST:/api/v1/admin/person/[personId]/refresh-images/getty-enrichment",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment/route.ts",
      "sourceLocator": {
        "line": 35,
        "matchedText": "`/admin/person/${personId}/refresh-images/getty-enrichment`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream:backend:POST:/api/v1/admin/person/[personId]/refresh-images/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream",
      "to": "backend:POST:/api/v1/admin/person/[personId]/refresh-images/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/refresh-images/stream/route.ts",
      "sourceLocator": {
        "line": 238,
        "matchedText": "`/admin/person/${personId}/refresh-images/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/refresh-profile/stream:backend:POST:/api/v1/admin/person/[personId]/refresh-profile/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/people/[personId]/refresh-profile/stream",
      "to": "backend:POST:/api/v1/admin/person/[personId]/refresh-profile/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/refresh-profile/stream/route.ts",
      "sourceLocator": {
        "line": 238,
        "matchedText": "`/admin/person/${personId}/refresh-profile/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream:backend:POST:/api/v1/admin/person/[personId]/reprocess-images/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream",
      "to": "backend:POST:/api/v1/admin/person/[personId]/reprocess-images/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/reprocess-images/stream/route.ts",
      "sourceLocator": {
        "line": 212,
        "matchedText": "`/admin/person/${personId}/reprocess-images/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/social-growth/refresh:backend:POST:/api/v1/admin/people/[personId]/socialblade/refresh",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/people/[personId]/social-growth/refresh",
      "to": "backend:POST:/api/v1/admin/people/[personId]/socialblade/refresh",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/people/[personId]/social-growth/refresh/route.ts",
      "sourceLocator": {
        "line": 35,
        "matchedText": "`/admin/people/${personId}/socialblade/refresh`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream:backend:POST:/api/v1/admin/shows/[showId]/assets/batch-jobs/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/assets/batch-jobs/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream/route.ts",
      "sourceLocator": {
        "line": 199,
        "matchedText": "`/admin/shows/${showId}/assets/batch-jobs/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/auto-count-images:backend:POST:/api/v1/admin/shows/[showId]/auto-count-images",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/auto-count-images",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/auto-count-images",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/auto-count-images/route.ts",
      "sourceLocator": {
        "line": 42,
        "matchedText": "`/admin/shows/${showId}/auto-count-images`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails:backend:POST:/api/v1/admin/shows/[showId]/bravo/videos/sync-thumbnails",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/bravo/videos/sync-thumbnails",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails/route.ts",
      "sourceLocator": {
        "line": 47,
        "matchedText": "`/admin/shows/${showId}/bravo/videos/sync-thumbnails`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/cast-matrix/sync:backend:POST:/api/v1/admin/shows/[showId]/cast-matrix/sync",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/cast-matrix/sync",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/cast-matrix/sync",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/cast-matrix/sync/route.ts",
      "sourceLocator": {
        "line": 25,
        "matchedText": "`/admin/shows/${showId}/cast-matrix/sync`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/cast/[personId]/roles:backend:POST:/api/v1/admin/shows/[showId]/cast/[personId]/roles",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/cast/[personId]/roles",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/cast/[personId]/roles",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/cast/[personId]/roles/route.ts",
      "sourceLocator": {
        "line": 18,
        "matchedText": "`/admin/shows/${showId}/cast/${personId}/roles`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/get-images/stream:backend:POST:/api/v1/admin/shows/[showId]/get-images/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/get-images/stream",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/get-images/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/get-images/stream/route.ts",
      "sourceLocator": {
        "line": 47,
        "matchedText": "`/admin/shows/${showId}/get-images/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/google-news/sync:backend:POST:/api/v1/admin/shows/[showId]/google-news/sync",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/google-news/sync",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/google-news/sync",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/google-news/sync/route.ts",
      "sourceLocator": {
        "line": 54,
        "matchedText": "`/admin/shows/${showId}/google-news/sync`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/commit:backend:POST:/api/v1/admin/shows/[showId]/import-bravo/commit",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/commit",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/import-bravo/commit",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/import-bravo/commit/route.ts",
      "sourceLocator": {
        "line": 21,
        "matchedText": "`/admin/shows/${showId}/import-bravo/commit`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview:backend:POST:/api/v1/admin/shows/[showId]/import-bravo/preview",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/import-bravo/preview",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/import-bravo/preview/route.ts",
      "sourceLocator": {
        "line": 21,
        "matchedText": "`/admin/shows/${showId}/import-bravo/preview`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream:backend:POST:/api/v1/admin/shows/[showId]/import-bravo/preview/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/import-bravo/preview/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream/route.ts",
      "sourceLocator": {
        "line": 195,
        "matchedText": "`/admin/shows/${showId}/import-bravo/preview/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/links:backend:POST:/api/v1/admin/shows/[showId]/links",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/links",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/links",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/route.ts",
      "sourceLocator": {
        "line": 47,
        "matchedText": "`/admin/shows/${showId}/links`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/links/add:backend:POST:/api/v1/admin/shows/[showId]/links/add",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/links/add",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/links/add",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/add/route.ts",
      "sourceLocator": {
        "line": 17,
        "matchedText": "`/admin/shows/${showId}/links/add`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/links/discover:backend:POST:/api/v1/admin/shows/[showId]/links/discover",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/links/discover",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/links/discover",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/discover/route.ts",
      "sourceLocator": {
        "line": 25,
        "matchedText": "`/admin/shows/${showId}/links/discover`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/links/discover/stream:backend:POST:/api/v1/admin/shows/[showId]/links/discover/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/links/discover/stream",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/links/discover/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/links/discover/stream/route.ts",
      "sourceLocator": {
        "line": 268,
        "matchedText": "`/admin/shows/${showId}/links/discover/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/logos/featured:backend:POST:/api/v1/admin/shows/logos/set-primary",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/logos/featured",
      "to": "backend:POST:/api/v1/admin/shows/logos/set-primary",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/logos/featured/route.ts",
      "sourceLocator": {
        "line": 91,
        "matchedText": "\"/admin/shows/logos/set-primary\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/refresh-photos/stream:backend:POST:/api/v1/admin/shows/[showId]/refresh-photos/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/refresh-photos/stream",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/refresh-photos/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/refresh-photos/stream/route.ts",
      "sourceLocator": {
        "line": 221,
        "matchedText": "`/admin/shows/${showId}/refresh-photos/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/refresh:backend:POST:/api/v1/admin/shows/[showId]/refresh",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/refresh",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/refresh",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/refresh/route.ts",
      "sourceLocator": {
        "line": 42,
        "matchedText": "`/admin/shows/${showId}/refresh`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/refresh/stream:backend:POST:/api/v1/admin/shows/[showId]/refresh/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/refresh/stream",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/refresh/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/refresh/stream/route.ts",
      "sourceLocator": {
        "line": 207,
        "matchedText": "`/admin/shows/${showId}/refresh/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/refresh/target/[target]/retry:backend:POST:/api/v1/admin/shows/[showId]/refresh/target/[target]/retry`,\n    );\n    if (!backendUrl) {\n      return NextResponse.json(\n        { error: \"Backend API not configured\" },\n        { status: 500 },\n      );\n    }\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) {\n      return NextResponse.json(\n        { error: \"Backend auth not configured\" },\n        { status: 500 },\n      );\n    }\n\n    let body: Record<string, unknown> = {};\n    if (request.headers.get(\"content-type",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/refresh/target/[target]/retry",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/refresh/target/[target]/retry`,\n    );\n    if (!backendUrl) {\n      return NextResponse.json(\n        { error: \"Backend API not configured\" },\n        { status: 500 },\n      );\n    }\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) {\n      return NextResponse.json(\n        { error: \"Backend auth not configured\" },\n        { status: 500 },\n      );\n    }\n\n    let body: Record<string, unknown> = {};\n    if (request.headers.get(\"content-type",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/refresh/target/[target]/retry/route.ts",
      "sourceLocator": {
        "line": 49,
        "matchedText": "`/admin/shows/${showId}/refresh/target/${target}/retry`,\n    );\n    if (!backendUrl) {\n      return NextResponse.json(\n        { error: \"Backend API not configured\" },\n        { status: 500 },\n      );\n    }\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) {\n      return NextResponse.json(\n        { error: \"Backend auth not configured\" },\n        { status: 500 },\n      );\n    }\n\n    let body: Record<string, unknown> = {};\n    if (request.headers.get(\"content-type\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/roles:backend:POST:/api/v1/admin/shows/[showId]/roles",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/roles",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/roles",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/roles/route.ts",
      "sourceLocator": {
        "line": 218,
        "matchedText": "`/admin/shows/${showId}/roles`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream:backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream/route.ts",
      "sourceLocator": {
        "line": 199,
        "matchedText": "`/admin/shows/${showId}/seasons/${seasonNumber}/assets/batch-jobs/stream`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit:backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit/route.ts",
      "sourceLocator": {
        "line": 24,
        "matchedText": "`/admin/shows/${showId}/seasons/${seasonNumber}/import-fandom/commit`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview:backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
      "to": "backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview/route.ts",
      "sourceLocator": {
        "line": 24,
        "matchedText": "`/admin/shows/${showId}/seasons/${seasonNumber}/import-fandom/preview`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/shows/sync-from-lists:backend:POST:/api/v1/admin/shows/sync-from-lists",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/shows/sync-from-lists",
      "to": "backend:POST:/api/v1/admin/shows/sync-from-lists",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/shows/sync-from-lists/route.ts",
      "sourceLocator": {
        "line": 33,
        "matchedText": "\"/admin/shows/sync-from-lists\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:POST:/api/admin/trr-api/social-growth/refresh-batch:backend:POST:/api/v1/admin/people/socialblade/refresh-batch",
      "kind": "proxies_to",
      "from": "route:POST:/api/admin/trr-api/social-growth/refresh-batch",
      "to": "backend:POST:/api/v1/admin/people/socialblade/refresh-batch",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/social-growth/refresh-batch/route.ts",
      "sourceLocator": {
        "line": 30,
        "matchedText": "\"/admin/people/socialblade/refresh-batch\""
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:PUT:/api/admin/social-posts/[postId]:backend:PUT:/api/v1/admin/social-posts/[postId]",
      "kind": "proxies_to",
      "from": "route:PUT:/api/admin/social-posts/[postId]",
      "to": "backend:PUT:/api/v1/admin/social-posts/[postId]",
      "title": null,
      "sourceFile": "src/app/api/admin/social-posts/[postId]/route.ts",
      "sourceLocator": {
        "line": 183,
        "matchedText": "`/admin/social-posts/${postId}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "proxies_to:route:PUT:/api/admin/trr-api/brands/franchise-rules/[franchiseKey]:backend:PUT:/api/v1/admin/brands/franchise-rules/[franchiseKey]",
      "kind": "proxies_to",
      "from": "route:PUT:/api/admin/trr-api/brands/franchise-rules/[franchiseKey]",
      "to": "backend:PUT:/api/v1/admin/brands/franchise-rules/[franchiseKey]",
      "title": null,
      "sourceFile": "src/app/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/route.ts",
      "sourceLocator": {
        "line": 25,
        "matchedText": "`/admin/brands/franchise-rules/${encodeURIComponent(franchiseKey)}`"
      },
      "provenance": "static_scan",
      "confidence": "high",
      "verificationStatus": "verified",
      "basis": [
        "static_scan:getBackendApiUrl"
      ]
    },
    {
      "id": "touches_repository:backend:DELETE:/api/v1/admin/shows/networks-streaming/overrides/[id]:repo:src/lib/server/admin/networks-streaming-repository.ts::module",
      "kind": "touches_repository",
      "from": "backend:DELETE:/api/v1/admin/shows/networks-streaming/overrides/[id]",
      "to": "repo:src/lib/server/admin/networks-streaming-repository.ts::module",
      "title": null,
      "sourceFile": null,
      "sourceLocator": null,
      "provenance": "manual_override",
      "confidence": "medium",
      "verificationStatus": "unverified_manual",
      "basis": [
        "manual_override:backend_override_repository_mapping"
      ]
    },
    {
      "id": "touches_repository:backend:GET:/api/v1/admin/brands/families/by-entity:repo:src/lib/server/admin/brand-profile-repository.ts::module",
      "kind": "touches_repository",
      "from": "backend:GET:/api/v1/admin/brands/families/by-entity",
      "to": "repo:src/lib/server/admin/brand-profile-repository.ts::module",
      "title": null,
      "sourceFile": null,
      "sourceLocator": null,
      "provenance": "manual_override",
      "confidence": "medium",
      "verificationStatus": "unverified_manual",
      "basis": [
        "manual_override:backend_family_lookup_repository_mapping"
      ]
    },
    {
      "id": "touches_repository:backend:GET:/api/v1/admin/shows/networks-streaming/overrides:repo:src/lib/server/admin/networks-streaming-repository.ts::module",
      "kind": "touches_repository",
      "from": "backend:GET:/api/v1/admin/shows/networks-streaming/overrides",
      "to": "repo:src/lib/server/admin/networks-streaming-repository.ts::module",
      "title": null,
      "sourceFile": null,
      "sourceLocator": null,
      "provenance": "manual_override",
      "confidence": "medium",
      "verificationStatus": "unverified_manual",
      "basis": [
        "manual_override:backend_override_repository_mapping"
      ]
    },
    {
      "id": "touches_repository:backend:PATCH:/api/v1/admin/shows/networks-streaming/overrides/[id]:repo:src/lib/server/admin/networks-streaming-repository.ts::module",
      "kind": "touches_repository",
      "from": "backend:PATCH:/api/v1/admin/shows/networks-streaming/overrides/[id]",
      "to": "repo:src/lib/server/admin/networks-streaming-repository.ts::module",
      "title": null,
      "sourceFile": null,
      "sourceLocator": null,
      "provenance": "manual_override",
      "confidence": "medium",
      "verificationStatus": "unverified_manual",
      "basis": [
        "manual_override:backend_override_repository_mapping"
      ]
    }
  ],
  "indexes": {
    "nodeIdsByKind": {
      "ui_surface": [
        "component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage",
        "component:src/components/admin/AdminGlobalSearch.tsx::AdminGlobalSearch",
        "component:src/components/admin/BravotvImageRunPanel.tsx::BravotvImageRunPanel",
        "component:src/components/admin/design-system/BrandFontMatchesPanel.tsx::BrandFontMatchesPanel",
        "component:src/components/admin/design-system/DesignSystemPageClient.tsx::DesignSystemPageClient",
        "component:src/components/admin/GameProblemReports.tsx::GameProblemReports",
        "component:src/components/admin/image-lightbox/ReplaceGettyDrawer.tsx::ReplaceGettyDrawer",
        "component:src/components/admin/ImageScrapeDrawer.tsx::ImageScrapeDrawer",
        "component:src/components/admin/NbcumvSeasonBios.tsx::NbcumvSeasonBios",
        "component:src/components/admin/PeopleSearchMultiSelect.tsx::PeopleSearchMultiSelect",
        "component:src/components/admin/social-posts-section.tsx::SocialPostsSection",
        "component:src/components/admin/social-week/WeekDetailPageView.tsx::WeekDetailPage",
        "page:/admin",
        "page:/admin/api-references",
        "page:/admin/brands",
        "page:/admin/cast-screentime",
        "page:/admin/design-docs/athletic-articles",
        "page:/admin/dev-dashboard",
        "page:/admin/dev-dashboard/skills-and-agents",
        "page:/admin/docs",
        "page:/admin/games",
        "page:/admin/games/bravodle",
        "page:/admin/games/flashback",
        "page:/admin/games/realitease",
        "page:/admin/groups",
        "page:/admin/networks-and-streaming/[entityType]/[entitySlug]",
        "page:/admin/reddit-post-details",
        "page:/admin/reddit-window-posts",
        "page:/admin/scrape-images",
        "page:/admin/settings",
        "page:/admin/shows",
        "page:/admin/shows/settings",
        "page:/admin/social",
        "page:/admin/social/bravo-content",
        "page:/admin/social/creator-content",
        "page:/admin/social/reddit",
        "page:/admin/social/reddit/[communitySlug]",
        "page:/admin/social/reddit/[communitySlug]/[showSlug]",
        "page:/admin/social/reddit/[communitySlug]/[showSlug]/[windowKey]",
        "page:/admin/social/reddit/[communitySlug]/[showSlug]/[windowKey]/[detailSlug]",
        "page:/admin/social/reddit/[communitySlug]/[showSlug]/[windowKey]/post/[postId]",
        "page:/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]",
        "page:/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]",
        "page:/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/[detailSlug]",
        "page:/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/post/[postId]",
        "page:/admin/survey-responses",
        "page:/admin/surveys",
        "page:/admin/surveys/[surveyKey]",
        "page:/admin/surveys/normalized",
        "page:/admin/surveys/normalized/[surveySlug]",
        "page:/admin/trr-shows",
        "page:/admin/trr-shows/[showId]",
        "page:/admin/trr-shows/[showId]/people/[personId]/[[...personTab]]",
        "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]",
        "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]",
        "page:/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/[platform]",
        "page:/admin/trr-shows/people/[personId]/[[...personTab]]",
        "page:/admin/users"
      ],
      "api_route": [
        "route:DELETE:/api/admin/covered-shows/[showId]",
        "route:DELETE:/api/admin/design-system/typography/sets/[setId]",
        "route:DELETE:/api/admin/flashback/events/[eventId]",
        "route:DELETE:/api/admin/images/[imageType]/[imageId]",
        "route:DELETE:/api/admin/networks-streaming/overrides/[id]",
        "route:DELETE:/api/admin/normalized-surveys/[surveySlug]",
        "route:DELETE:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]",
        "route:DELETE:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
        "route:DELETE:/api/admin/normalized-surveys/[surveySlug]/runs/[runId]",
        "route:DELETE:/api/admin/reddit/communities/[communityId]",
        "route:DELETE:/api/admin/reddit/threads/[threadId]",
        "route:DELETE:/api/admin/shows/[showKey]",
        "route:DELETE:/api/admin/shows/[showKey]/icons/[iconId]",
        "route:DELETE:/api/admin/shows/[showKey]/seasons/[seasonId]",
        "route:DELETE:/api/admin/shows/palette-library/[paletteId]",
        "route:DELETE:/api/admin/social-posts/[postId]",
        "route:DELETE:/api/admin/surveys/[surveyKey]",
        "route:DELETE:/api/admin/surveys/[surveyKey]/cast/[castId]",
        "route:DELETE:/api/admin/surveys/[surveyKey]/episodes/[episodeId]",
        "route:DELETE:/api/admin/trr-api/brands/families/[familyId]/members/[memberId]",
        "route:DELETE:/api/admin/trr-api/brands/logos/options/saved/[assetId]",
        "route:DELETE:/api/admin/trr-api/media-assets/[assetId]",
        "route:DELETE:/api/admin/trr-api/people/[personId]/cover-photo",
        "route:DELETE:/api/admin/trr-api/shows/[showId]/links/[linkId]",
        "route:GET:/api/admin/assets/deadline-gallery",
        "route:GET:/api/admin/auth/status",
        "route:GET:/api/admin/auth/status/drill-report",
        "route:GET:/api/admin/brands/profile",
        "route:GET:/api/admin/colors/image-proxy",
        "route:GET:/api/admin/covered-shows",
        "route:GET:/api/admin/covered-shows/[showId]",
        "route:GET:/api/admin/design-system/brand-font-matches",
        "route:GET:/api/admin/design-system/nyt-occurrences",
        "route:GET:/api/admin/design-system/typography",
        "route:GET:/api/admin/dev-dashboard",
        "route:GET:/api/admin/dev-dashboard/skills-and-agents",
        "route:GET:/api/admin/flashback/quizzes",
        "route:GET:/api/admin/flashback/quizzes/[quizId]/events",
        "route:GET:/api/admin/games/problem-reports",
        "route:GET:/api/admin/getty-local/scrape",
        "route:GET:/api/admin/images/[imageType]/[imageId]",
        "route:GET:/api/admin/nbcumv/talent-bios",
        "route:GET:/api/admin/networks-streaming/detail",
        "route:GET:/api/admin/networks-streaming/overrides",
        "route:GET:/api/admin/networks-streaming/summary",
        "route:GET:/api/admin/normalized-surveys",
        "route:GET:/api/admin/normalized-surveys/[surveySlug]",
        "route:GET:/api/admin/normalized-surveys/[surveySlug]/questions",
        "route:GET:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]",
        "route:GET:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
        "route:GET:/api/admin/normalized-surveys/[surveySlug]/runs",
        "route:GET:/api/admin/normalized-surveys/[surveySlug]/runs/[runId]",
        "route:GET:/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/export",
        "route:GET:/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/responses",
        "route:GET:/api/admin/recent-people",
        "route:GET:/api/admin/reddit/analytics/community/[communityId]/posts",
        "route:GET:/api/admin/reddit/analytics/community/[communityId]/summary",
        "route:GET:/api/admin/reddit/communities",
        "route:GET:/api/admin/reddit/communities/[communityId]",
        "route:GET:/api/admin/reddit/communities/[communityId]/backfill/snapshot",
        "route:GET:/api/admin/reddit/communities/[communityId]/discover",
        "route:GET:/api/admin/reddit/communities/[communityId]/episode-discussions/refresh",
        "route:GET:/api/admin/reddit/communities/[communityId]/posts/[postId]/details",
        "route:GET:/api/admin/reddit/communities/[communityId]/posts/resolve",
        "route:GET:/api/admin/reddit/communities/[communityId]/stored-post-counts",
        "route:GET:/api/admin/reddit/communities/[communityId]/stored-posts",
        "route:GET:/api/admin/reddit/runs",
        "route:GET:/api/admin/reddit/runs/[runId]",
        "route:GET:/api/admin/reddit/threads",
        "route:GET:/api/admin/reddit/threads/[threadId]",
        "route:GET:/api/admin/shows",
        "route:GET:/api/admin/shows/[showKey]",
        "route:GET:/api/admin/shows/[showKey]/icons",
        "route:GET:/api/admin/shows/[showKey]/seasons",
        "route:GET:/api/admin/shows/[showKey]/seasons/[seasonId]",
        "route:GET:/api/admin/shows/by-trr-show/[trrShowId]",
        "route:GET:/api/admin/shows/palette-library",
        "route:GET:/api/admin/social-posts/[postId]",
        "route:GET:/api/admin/social/landing",
        "route:GET:/api/admin/surveys",
        "route:GET:/api/admin/surveys/[surveyKey]",
        "route:GET:/api/admin/surveys/[surveyKey]/cast",
        "route:GET:/api/admin/surveys/[surveyKey]/cast/[castId]",
        "route:GET:/api/admin/surveys/[surveyKey]/episodes",
        "route:GET:/api/admin/surveys/[surveyKey]/episodes/[episodeId]",
        "route:GET:/api/admin/surveys/[surveyKey]/export",
        "route:GET:/api/admin/surveys/[surveyKey]/responses",
        "route:GET:/api/admin/surveys/[surveyKey]/responses/[responseId]",
        "route:GET:/api/admin/surveys/[surveyKey]/theme",
        "route:GET:/api/admin/trr-api/brands/families",
        "route:GET:/api/admin/trr-api/brands/families/[familyId]/links",
        "route:GET:/api/admin/trr-api/brands/families/[familyId]/wikipedia-show-urls",
        "route:GET:/api/admin/trr-api/brands/families/by-entity",
        "route:GET:/api/admin/trr-api/brands/families/suggestions",
        "route:GET:/api/admin/trr-api/brands/franchise-rules",
        "route:GET:/api/admin/trr-api/brands/logo-targets",
        "route:GET:/api/admin/trr-api/brands/logos",
        "route:GET:/api/admin/trr-api/brands/logos/options/modal",
        "route:GET:/api/admin/trr-api/brands/logos/options/preview",
        "route:GET:/api/admin/trr-api/brands/logos/options/source-suggestions",
        "route:GET:/api/admin/trr-api/brands/logos/options/sources",
        "route:GET:/api/admin/trr-api/brands/shows-franchises",
        "route:GET:/api/admin/trr-api/bravotv/images/people/[personId]/latest",
        "route:GET:/api/admin/trr-api/bravotv/images/runs/[runId]/artifacts/[...artifactName]",
        "route:GET:/api/admin/trr-api/bravotv/images/shows/[showId]/latest",
        "route:GET:/api/admin/trr-api/cast-screentime/[...path]",
        "route:GET:/api/admin/trr-api/media-links",
        "route:GET:/api/admin/trr-api/operations/[operationId]",
        "route:GET:/api/admin/trr-api/operations/[operationId]/stream",
        "route:GET:/api/admin/trr-api/operations/health",
        "route:GET:/api/admin/trr-api/people",
        "route:GET:/api/admin/trr-api/people/[personId]",
        "route:GET:/api/admin/trr-api/people/[personId]/cover-photo",
        "route:GET:/api/admin/trr-api/people/[personId]/credits",
        "route:GET:/api/admin/trr-api/people/[personId]/external-ids",
        "route:GET:/api/admin/trr-api/people/[personId]/fandom",
        "route:GET:/api/admin/trr-api/people/[personId]/photos",
        "route:GET:/api/admin/trr-api/people/[personId]/social-growth",
        "route:GET:/api/admin/trr-api/people/home",
        "route:GET:/api/admin/trr-api/people/resolve-slug",
        "route:GET:/api/admin/trr-api/search",
        "route:GET:/api/admin/trr-api/seasons/[seasonId]/episodes",
        "route:GET:/api/admin/trr-api/seasons/[seasonId]/unassigned-backdrops",
        "route:GET:/api/admin/trr-api/shows",
        "route:GET:/api/admin/trr-api/shows/[showId]",
        "route:GET:/api/admin/trr-api/shows/[showId]/assets",
        "route:GET:/api/admin/trr-api/shows/[showId]/bravo/news",
        "route:GET:/api/admin/trr-api/shows/[showId]/bravo/videos",
        "route:GET:/api/admin/trr-api/shows/[showId]/cast",
        "route:GET:/api/admin/trr-api/shows/[showId]/cast-role-members",
        "route:GET:/api/admin/trr-api/shows/[showId]/credits",
        "route:GET:/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]",
        "route:GET:/api/admin/trr-api/shows/[showId]/links",
        "route:GET:/api/admin/trr-api/shows/[showId]/news",
        "route:GET:/api/admin/trr-api/shows/[showId]/roles",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/comments-coverage",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/mirror-coverage",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/snapshot",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/live-health",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/snapshot",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/summary",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/export",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/worker-health",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/progress",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/summary",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/shared-status",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/stream",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/cast-members",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/content-health",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/hashtags",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/overview",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/posts/[postId]/detail",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sentiment-trends",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/[soundId]",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/[soundId]/posts",
        "route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/survey-cast",
        "route:GET:/api/admin/trr-api/shows/[showId]/social-posts",
        "route:GET:/api/admin/trr-api/shows/[showId]/surveys",
        "route:GET:/api/admin/trr-api/shows/resolve-slug",
        "route:GET:/api/admin/trr-api/social-growth/cast-comparison/snapshot",
        "route:GET:/api/admin/trr-api/social/ingest/health-dot",
        "route:GET:/api/admin/trr-api/social/ingest/live-status",
        "route:GET:/api/admin/trr-api/social/ingest/live-status/stream",
        "route:GET:/api/admin/trr-api/social/ingest/queue-status",
        "route:GET:/api/admin/trr-api/social/ingest/workers/[workerId]/detail",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/posts",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/review-queue",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/progress",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/verification",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/collaborators-tags",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/cookies/health",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags/timeline",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/posts",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/snapshot",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/socialblade",
        "route:GET:/api/admin/trr-api/social/profiles/[platform]/[handle]/summary",
        "route:GET:/api/admin/trr-api/social/shared/review-queue",
        "route:GET:/api/admin/trr-api/social/shared/runs",
        "route:GET:/api/admin/trr-api/social/shared/sources",
        "route:PATCH:/api/admin/flashback/quizzes/[quizId]",
        "route:PATCH:/api/admin/networks-streaming/overrides/[id]",
        "route:PATCH:/api/admin/reddit/communities/[communityId]",
        "route:PATCH:/api/admin/reddit/post-matches",
        "route:PATCH:/api/admin/reddit/threads/[threadId]",
        "route:PATCH:/api/admin/trr-api/brands/families/[familyId]",
        "route:PATCH:/api/admin/trr-api/brands/families/[familyId]/links/[ruleId]",
        "route:PATCH:/api/admin/trr-api/cast-photos/[photoId]/people-count",
        "route:PATCH:/api/admin/trr-api/cast-screentime/[...path]",
        "route:PATCH:/api/admin/trr-api/media-links/[linkId]/context",
        "route:PATCH:/api/admin/trr-api/people/[personId]",
        "route:PATCH:/api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed",
        "route:PATCH:/api/admin/trr-api/shows/[showId]/links/[linkId]",
        "route:PATCH:/api/admin/trr-api/shows/[showId]/roles/[roleId]",
        "route:POST:/api/admin/auth/status/reset",
        "route:POST:/api/admin/covered-shows",
        "route:POST:/api/admin/design-system/typography/sets",
        "route:POST:/api/admin/flashback/quizzes",
        "route:POST:/api/admin/flashback/quizzes/[quizId]/events",
        "route:POST:/api/admin/getty-local/scrape",
        "route:POST:/api/admin/networks-streaming/overrides",
        "route:POST:/api/admin/networks-streaming/sync",
        "route:POST:/api/admin/normalized-surveys",
        "route:POST:/api/admin/normalized-surveys/[surveySlug]/questions",
        "route:POST:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
        "route:POST:/api/admin/normalized-surveys/[surveySlug]/runs",
        "route:POST:/api/admin/recent-people",
        "route:POST:/api/admin/reddit/auto-categorize-flairs-batch",
        "route:POST:/api/admin/reddit/communities",
        "route:POST:/api/admin/reddit/communities/[communityId]/auto-categorize-flairs",
        "route:POST:/api/admin/reddit/communities/[communityId]/episode-discussions/save",
        "route:POST:/api/admin/reddit/communities/[communityId]/flairs/refresh",
        "route:POST:/api/admin/reddit/runs/backfill",
        "route:POST:/api/admin/reddit/threads",
        "route:POST:/api/admin/scrape/import",
        "route:POST:/api/admin/scrape/import/stream",
        "route:POST:/api/admin/scrape/preview",
        "route:POST:/api/admin/shows",
        "route:POST:/api/admin/shows/[showKey]/icons",
        "route:POST:/api/admin/shows/[showKey]/seasons",
        "route:POST:/api/admin/shows/palette-library",
        "route:POST:/api/admin/surveys/[surveyKey]/cast",
        "route:POST:/api/admin/surveys/[surveyKey]/episodes",
        "route:POST:/api/admin/surveys/[surveyKey]/episodes/[episodeId]/activate",
        "route:POST:/api/admin/trr-api/assets/archive",
        "route:POST:/api/admin/trr-api/assets/content-type",
        "route:POST:/api/admin/trr-api/assets/star",
        "route:POST:/api/admin/trr-api/brands/families",
        "route:POST:/api/admin/trr-api/brands/families/[familyId]/links",
        "route:POST:/api/admin/trr-api/brands/families/[familyId]/links/apply",
        "route:POST:/api/admin/trr-api/brands/families/[familyId]/members",
        "route:POST:/api/admin/trr-api/brands/families/[familyId]/wikipedia-import",
        "route:POST:/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/apply",
        "route:POST:/api/admin/trr-api/brands/logos/options/assign",
        "route:POST:/api/admin/trr-api/brands/logos/options/discover",
        "route:POST:/api/admin/trr-api/brands/logos/options/select",
        "route:POST:/api/admin/trr-api/brands/logos/options/source-query",
        "route:POST:/api/admin/trr-api/brands/logos/sync",
        "route:POST:/api/admin/trr-api/bravotv/images/people/[personId]/stream",
        "route:POST:/api/admin/trr-api/bravotv/images/shows/[showId]/stream",
        "route:POST:/api/admin/trr-api/cast-photos/[photoId]/auto-count",
        "route:POST:/api/admin/trr-api/cast-photos/[photoId]/detect-text-overlay",
        "route:POST:/api/admin/trr-api/cast-photos/[photoId]/mirror",
        "route:POST:/api/admin/trr-api/cast-photos/[photoId]/variants",
        "route:POST:/api/admin/trr-api/cast-screentime/[...path]",
        "route:POST:/api/admin/trr-api/media-assets/[assetId]/auto-count",
        "route:POST:/api/admin/trr-api/media-assets/[assetId]/detect-text-overlay",
        "route:POST:/api/admin/trr-api/media-assets/[assetId]/mirror",
        "route:POST:/api/admin/trr-api/media-assets/[assetId]/replace-from-url",
        "route:POST:/api/admin/trr-api/media-assets/[assetId]/reverse-image-search",
        "route:POST:/api/admin/trr-api/media-assets/[assetId]/variants",
        "route:POST:/api/admin/trr-api/media-links",
        "route:POST:/api/admin/trr-api/operations/[operationId]/cancel",
        "route:POST:/api/admin/trr-api/operations/cancel",
        "route:POST:/api/admin/trr-api/operations/stale/cancel",
        "route:POST:/api/admin/trr-api/people/[personId]/import-fandom/commit",
        "route:POST:/api/admin/trr-api/people/[personId]/import-fandom/preview",
        "route:POST:/api/admin/trr-api/people/[personId]/refresh-images",
        "route:POST:/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment",
        "route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream",
        "route:POST:/api/admin/trr-api/people/[personId]/refresh-profile/stream",
        "route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream",
        "route:POST:/api/admin/trr-api/people/[personId]/social-growth/refresh",
        "route:POST:/api/admin/trr-api/seasons/[seasonId]/assign-backdrops",
        "route:POST:/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream",
        "route:POST:/api/admin/trr-api/shows/[showId]/auto-count-images",
        "route:POST:/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails",
        "route:POST:/api/admin/trr-api/shows/[showId]/cast-matrix/sync",
        "route:POST:/api/admin/trr-api/shows/[showId]/cast/[personId]/roles",
        "route:POST:/api/admin/trr-api/shows/[showId]/get-images/stream",
        "route:POST:/api/admin/trr-api/shows/[showId]/google-news/sync",
        "route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/commit",
        "route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview",
        "route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream",
        "route:POST:/api/admin/trr-api/shows/[showId]/links",
        "route:POST:/api/admin/trr-api/shows/[showId]/links/add",
        "route:POST:/api/admin/trr-api/shows/[showId]/links/discover",
        "route:POST:/api/admin/trr-api/shows/[showId]/links/discover/stream",
        "route:POST:/api/admin/trr-api/shows/[showId]/logos/featured",
        "route:POST:/api/admin/trr-api/shows/[showId]/refresh",
        "route:POST:/api/admin/trr-api/shows/[showId]/refresh-photos/stream",
        "route:POST:/api/admin/trr-api/shows/[showId]/refresh/stream",
        "route:POST:/api/admin/trr-api/shows/[showId]/refresh/target/[target]/retry",
        "route:POST:/api/admin/trr-api/shows/[showId]/roles",
        "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
        "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
        "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
        "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]",
        "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest",
        "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/runs/[runId]/cancel",
        "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/mirror/requeue",
        "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/cancel",
        "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions",
        "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/cancel",
        "route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/retry",
        "route:POST:/api/admin/trr-api/shows/[showId]/social-posts",
        "route:POST:/api/admin/trr-api/shows/[showId]/surveys",
        "route:POST:/api/admin/trr-api/shows/sync-from-lists",
        "route:POST:/api/admin/trr-api/snapshots/invalidate",
        "route:POST:/api/admin/trr-api/social-growth/refresh-batch",
        "route:POST:/api/admin/trr-api/social/ingest/active-jobs/cancel",
        "route:POST:/api/admin/trr-api/social/ingest/jobs/[jobId]/debug",
        "route:POST:/api/admin/trr-api/social/ingest/recent-failures/dismiss",
        "route:POST:/api/admin/trr-api/social/ingest/reset-health",
        "route:POST:/api/admin/trr-api/social/ingest/stuck-jobs/cancel",
        "route:POST:/api/admin/trr-api/social/ingest/workers/purge-inactive",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/apify-backfill",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/backfill",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/freshness",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis/run",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/resume-tail",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/review-queue/[itemId]/resolve",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/cancel",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/dismiss",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/repair-auth",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/sync-newer",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/sync-recent",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/cookies/refresh",
        "route:POST:/api/admin/trr-api/social/profiles/[platform]/[handle]/socialblade/refresh",
        "route:POST:/api/admin/trr-api/social/shared/ingest",
        "route:POST:/api/admin/trr-api/social/shared/review-queue/[itemId]/resolve",
        "route:PUT:/api/admin/design-system/typography/assignments",
        "route:PUT:/api/admin/design-system/typography/sets/[setId]",
        "route:PUT:/api/admin/images/[imageType]/[imageId]/archive",
        "route:PUT:/api/admin/images/[imageType]/[imageId]/reassign",
        "route:PUT:/api/admin/normalized-surveys/[surveySlug]",
        "route:PUT:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]",
        "route:PUT:/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options",
        "route:PUT:/api/admin/normalized-surveys/[surveySlug]/runs/[runId]",
        "route:PUT:/api/admin/shows/[showKey]",
        "route:PUT:/api/admin/shows/[showKey]/seasons/[seasonId]",
        "route:PUT:/api/admin/social-posts/[postId]",
        "route:PUT:/api/admin/surveys/[surveyKey]",
        "route:PUT:/api/admin/surveys/[surveyKey]/cast/[castId]",
        "route:PUT:/api/admin/surveys/[surveyKey]/cast/reorder",
        "route:PUT:/api/admin/surveys/[surveyKey]/episodes/[episodeId]",
        "route:PUT:/api/admin/surveys/[surveyKey]/theme",
        "route:PUT:/api/admin/trr-api/brands/franchise-rules/[franchiseKey]",
        "route:PUT:/api/admin/trr-api/cast-photos/[photoId]/tags",
        "route:PUT:/api/admin/trr-api/media-links/[linkId]/tags",
        "route:PUT:/api/admin/trr-api/people/[personId]/cover-photo",
        "route:PUT:/api/admin/trr-api/people/[personId]/external-ids",
        "route:PUT:/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop",
        "route:PUT:/api/admin/trr-api/shows/[showId]",
        "route:PUT:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets",
        "route:PUT:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/survey-cast",
        "route:PUT:/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags",
        "route:PUT:/api/admin/trr-api/social/shared/sources"
      ],
      "backend_endpoint": [
        "backend:DELETE:/api/v1/admin/brands/logos/options/saved/[assetId]",
        "backend:DELETE:/api/v1/admin/covered-shows/[showId]",
        "backend:DELETE:/api/v1/admin/media-assets/[assetId]",
        "backend:DELETE:/api/v1/admin/shows/[showId]/links/[linkId]",
        "backend:DELETE:/api/v1/admin/shows/networks-streaming/overrides/[id]",
        "backend:DELETE:/api/v1/admin/social-posts/[postId]",
        "backend:GET:/api/v1/admin/brands/families",
        "backend:GET:/api/v1/admin/brands/families/[familyId]/links",
        "backend:GET:/api/v1/admin/brands/families/[familyId]/wikipedia-show-urls",
        "backend:GET:/api/v1/admin/brands/families/by-entity",
        "backend:GET:/api/v1/admin/brands/families/suggestions",
        "backend:GET:/api/v1/admin/brands/franchise-rules",
        "backend:GET:/api/v1/admin/brands/logo-targets",
        "backend:GET:/api/v1/admin/brands/logos/options/modal",
        "backend:GET:/api/v1/admin/brands/logos/options/source-suggestions",
        "backend:GET:/api/v1/admin/brands/logos/options/sources",
        "backend:GET:/api/v1/admin/bravotv/images/people/[personId]/latest",
        "backend:GET:/api/v1/admin/bravotv/images/shows/[showId]/latest",
        "backend:GET:/api/v1/admin/covered-shows/[showId]",
        "backend:GET:/api/v1/admin/operations/[operationId]",
        "backend:GET:/api/v1/admin/operations/[operationId]/stream",
        "backend:GET:/api/v1/admin/operations/health",
        "backend:GET:/api/v1/admin/people/[personId]/socialblade",
        "backend:GET:/api/v1/admin/person/[personId]/fandom",
        "backend:GET:/api/v1/admin/shows/[showId]/bravo/news",
        "backend:GET:/api/v1/admin/shows/[showId]/bravo/videos",
        "backend:GET:/api/v1/admin/shows/[showId]/cast-role-members",
        "backend:GET:/api/v1/admin/shows/[showId]/google-news/sync/[jobId]",
        "backend:GET:/api/v1/admin/shows/[showId]/links",
        "backend:GET:/api/v1/admin/shows/[showId]/news",
        "backend:GET:/api/v1/admin/shows/[showId]/roles",
        "backend:GET:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/fandom",
        "backend:GET:/api/v1/admin/shows/[showKey]/icons",
        "backend:GET:/api/v1/admin/shows/networks-streaming/overrides",
        "backend:GET:/api/v1/admin/social-posts/[postId]",
        "backend:GET:/api/v1/admin/socials/live-status/stream",
        "backend:PATCH:/api/v1/admin/brands/families/[familyId]",
        "backend:PATCH:/api/v1/admin/brands/families/[familyId]/links/[ruleId]`,\n    );\n    if (!backendUrl) return NextResponse.json({ error: \"Backend API not configured\" }, { status: 500 });\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) return NextResponse.json({ error: \"Backend auth not configured\" }, { status: 500 });\n\n    const body =\n      request.headers.get(\"content-type",
        "backend:PATCH:/api/v1/admin/shows/[showId]/links/[linkId]",
        "backend:PATCH:/api/v1/admin/shows/[showId]/roles/[roleId]",
        "backend:PATCH:/api/v1/admin/shows/networks-streaming/overrides/[id]",
        "backend:POST:/api/v1/admin/assets/archive",
        "backend:POST:/api/v1/admin/assets/content-type",
        "backend:POST:/api/v1/admin/assets/star",
        "backend:POST:/api/v1/admin/brands/families",
        "backend:POST:/api/v1/admin/brands/families/[familyId]/links",
        "backend:POST:/api/v1/admin/brands/families/[familyId]/links/apply",
        "backend:POST:/api/v1/admin/brands/families/[familyId]/members",
        "backend:POST:/api/v1/admin/brands/families/[familyId]/wikipedia-import",
        "backend:POST:/api/v1/admin/brands/franchise-rules/[franchiseKey]/apply",
        "backend:POST:/api/v1/admin/brands/logos/options/assign",
        "backend:POST:/api/v1/admin/brands/logos/options/discover",
        "backend:POST:/api/v1/admin/brands/logos/options/select",
        "backend:POST:/api/v1/admin/brands/logos/options/source-query",
        "backend:POST:/api/v1/admin/brands/logos/sync",
        "backend:POST:/api/v1/admin/bravotv/images/people/[personId]/stream",
        "backend:POST:/api/v1/admin/bravotv/images/shows/[showId]/stream",
        "backend:POST:/api/v1/admin/cast-photos/[photoId]/auto-count",
        "backend:POST:/api/v1/admin/cast-photos/[photoId]/detect-text-overlay",
        "backend:POST:/api/v1/admin/cast-photos/[photoId]/mirror",
        "backend:POST:/api/v1/admin/cast-photos/[photoId]/variants",
        "backend:POST:/api/v1/admin/media-assets/[assetId]/auto-count",
        "backend:POST:/api/v1/admin/media-assets/[assetId]/detect-text-overlay",
        "backend:POST:/api/v1/admin/media-assets/[assetId]/mirror",
        "backend:POST:/api/v1/admin/media-assets/[assetId]/replace-from-url",
        "backend:POST:/api/v1/admin/media-assets/[assetId]/reverse-image-search",
        "backend:POST:/api/v1/admin/media-assets/[assetId]/variants",
        "backend:POST:/api/v1/admin/operations/[operationId]/cancel",
        "backend:POST:/api/v1/admin/operations/cancel",
        "backend:POST:/api/v1/admin/operations/stale/cancel",
        "backend:POST:/api/v1/admin/people/[personId]/socialblade/refresh",
        "backend:POST:/api/v1/admin/people/socialblade/refresh-batch",
        "backend:POST:/api/v1/admin/person/[personId]/import-fandom/commit",
        "backend:POST:/api/v1/admin/person/[personId]/import-fandom/preview",
        "backend:POST:/api/v1/admin/person/[personId]/refresh-images",
        "backend:POST:/api/v1/admin/person/[personId]/refresh-images/getty-enrichment",
        "backend:POST:/api/v1/admin/person/[personId]/refresh-images/stream",
        "backend:POST:/api/v1/admin/person/[personId]/refresh-profile/stream",
        "backend:POST:/api/v1/admin/person/[personId]/reprocess-images/stream",
        "backend:POST:/api/v1/admin/scrape/import",
        "backend:POST:/api/v1/admin/scrape/import/stream",
        "backend:POST:/api/v1/admin/scrape/preview",
        "backend:POST:/api/v1/admin/shows/[showId]/assets/batch-jobs/stream",
        "backend:POST:/api/v1/admin/shows/[showId]/auto-count-images",
        "backend:POST:/api/v1/admin/shows/[showId]/bravo/videos/sync-thumbnails",
        "backend:POST:/api/v1/admin/shows/[showId]/cast-matrix/sync",
        "backend:POST:/api/v1/admin/shows/[showId]/cast/[personId]/roles",
        "backend:POST:/api/v1/admin/shows/[showId]/get-images/stream",
        "backend:POST:/api/v1/admin/shows/[showId]/google-news/sync",
        "backend:POST:/api/v1/admin/shows/[showId]/import-bravo/commit",
        "backend:POST:/api/v1/admin/shows/[showId]/import-bravo/preview",
        "backend:POST:/api/v1/admin/shows/[showId]/import-bravo/preview/stream",
        "backend:POST:/api/v1/admin/shows/[showId]/links",
        "backend:POST:/api/v1/admin/shows/[showId]/links/add",
        "backend:POST:/api/v1/admin/shows/[showId]/links/discover",
        "backend:POST:/api/v1/admin/shows/[showId]/links/discover/stream",
        "backend:POST:/api/v1/admin/shows/[showId]/refresh",
        "backend:POST:/api/v1/admin/shows/[showId]/refresh-photos/stream",
        "backend:POST:/api/v1/admin/shows/[showId]/refresh/stream",
        "backend:POST:/api/v1/admin/shows/[showId]/refresh/target/[target]/retry`,\n    );\n    if (!backendUrl) {\n      return NextResponse.json(\n        { error: \"Backend API not configured\" },\n        { status: 500 },\n      );\n    }\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) {\n      return NextResponse.json(\n        { error: \"Backend auth not configured\" },\n        { status: 500 },\n      );\n    }\n\n    let body: Record<string, unknown> = {};\n    if (request.headers.get(\"content-type",
        "backend:POST:/api/v1/admin/shows/[showId]/roles",
        "backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
        "backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
        "backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
        "backend:POST:/api/v1/admin/shows/[showKey]/icons",
        "backend:POST:/api/v1/admin/shows/logos/set-primary",
        "backend:POST:/api/v1/admin/shows/networks-streaming/overrides",
        "backend:POST:/api/v1/admin/shows/sync-from-lists",
        "backend:POST:/api/v1/admin/shows/sync-networks-streaming",
        "backend:PUT:/api/v1/admin/brands/franchise-rules/[franchiseKey]",
        "backend:PUT:/api/v1/admin/social-posts/[postId]"
      ],
      "repository_surface": [
        "repo:src/lib/server/admin/brand-profile-repository.ts::module",
        "repo:src/lib/server/admin/networks-streaming-repository.ts::module"
      ],
      "polling_loop": [
        "poll:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::set-interval-1",
        "poll:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::set-interval-2",
        "poll:src/components/admin/social-week/WeekDetailPageView.tsx::set-interval-1",
        "poll:src/components/admin/social-week/WeekDetailPageView.tsx::set-interval-2"
      ]
    },
    "edgeIdsByKind": {
      "originates_request": [
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:GET:/api/admin/trr-api/people",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:GET:/api/admin/trr-api/people/[personId]/fandom",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:PATCH:/api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/assets/archive",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/assets/content-type",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/assets/star",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/cast-photos/[photoId]/mirror",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/media-assets/[assetId]/mirror",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/people/[personId]/import-fandom/commit",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/people/[personId]/import-fandom/preview",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/people/[personId]/refresh-images",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:PUT:/api/admin/images/[imageType]/[imageId]/reassign",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:PUT:/api/admin/trr-api/people/[personId]/cover-photo",
        "originates_request:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:route:PUT:/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop",
        "originates_request:component:src/components/admin/AdminGlobalSearch.tsx::AdminGlobalSearch:route:GET:/api/admin/trr-api/search",
        "originates_request:component:src/components/admin/BravotvImageRunPanel.tsx::BravotvImageRunPanel:route:GET:/api/admin/trr-api/bravotv/images/runs/[runId]/artifacts/[...artifactName]",
        "originates_request:component:src/components/admin/design-system/BrandFontMatchesPanel.tsx::BrandFontMatchesPanel:route:GET:/api/admin/design-system/brand-font-matches",
        "originates_request:component:src/components/admin/design-system/DesignSystemPageClient.tsx::DesignSystemPageClient:route:GET:/api/admin/design-system/typography",
        "originates_request:component:src/components/admin/GameProblemReports.tsx::GameProblemReports:route:GET:/api/admin/games/problem-reports",
        "originates_request:component:src/components/admin/image-lightbox/ReplaceGettyDrawer.tsx::ReplaceGettyDrawer:route:POST:/api/admin/trr-api/media-assets/[assetId]/replace-from-url",
        "originates_request:component:src/components/admin/image-lightbox/ReplaceGettyDrawer.tsx::ReplaceGettyDrawer:route:POST:/api/admin/trr-api/media-assets/[assetId]/reverse-image-search",
        "originates_request:component:src/components/admin/ImageScrapeDrawer.tsx::ImageScrapeDrawer:route:POST:/api/admin/scrape/import/stream",
        "originates_request:component:src/components/admin/NbcumvSeasonBios.tsx::NbcumvSeasonBios:route:GET:/api/admin/nbcumv/talent-bios",
        "originates_request:component:src/components/admin/PeopleSearchMultiSelect.tsx::PeopleSearchMultiSelect:route:GET:/api/admin/trr-api/people",
        "originates_request:component:src/components/admin/social-posts-section.tsx::SocialPostsSection:route:DELETE:/api/admin/social-posts/[postId]",
        "originates_request:component:src/components/admin/social-posts-section.tsx::SocialPostsSection:route:POST:/api/admin/trr-api/shows/[showId]/social-posts",
        "originates_request:component:src/components/admin/social-posts-section.tsx::SocialPostsSection:route:PUT:/api/admin/social-posts/[postId]",
        "originates_request:component:src/components/admin/social-week/WeekDetailPageView.tsx::WeekDetailPage:route:GET:/api/admin/trr-api/shows/resolve-slug",
        "originates_request:page:/admin/games/flashback:route:DELETE:/api/admin/flashback/events/[eventId]",
        "originates_request:page:/admin/reddit-window-posts:route:PATCH:/api/admin/reddit/post-matches",
        "originates_request:page:/admin/scrape-images:route:POST:/api/admin/scrape/import/stream",
        "originates_request:page:/admin/survey-responses:route:GET:/api/admin/surveys",
        "originates_request:page:/admin/survey-responses:route:GET:/api/admin/surveys/[surveyKey]/export",
        "originates_request:page:/admin/survey-responses:route:GET:/api/admin/surveys/[surveyKey]/responses",
        "originates_request:page:/admin/survey-responses:route:GET:/api/admin/surveys/[surveyKey]/responses/[responseId]",
        "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/people/[personId]/refresh-images",
        "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream",
        "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/people/[personId]/refresh-profile/stream",
        "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream",
        "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream",
        "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream",
        "originates_request:page:/admin/trr-shows/[showId]:route:POST:/api/admin/trr-api/shows/[showId]/refresh/stream",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:DELETE:/api/admin/trr-api/media-assets/[assetId]",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/seasons/[seasonId]/episodes",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/seasons/[seasonId]/unassigned-backdrops",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/[showId]",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/[showId]/cast",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/[showId]/credits",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/[showId]/seasons",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:GET:/api/admin/trr-api/shows/resolve-slug",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/assets/archive",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/assets/content-type",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/assets/star",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/media-assets/[assetId]/detect-text-overlay",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/seasons/[seasonId]/assign-backdrops",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/shows/[showId]/refresh-photos/stream",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/shows/[showId]/refresh/stream",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
        "originates_request:page:/admin/trr-shows/[showId]/seasons/[seasonNumber]:route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview"
      ],
      "contains_polling": [
        "contains_polling:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:poll:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::set-interval-1",
        "contains_polling:component:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::PersonProfilePage:poll:src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx::set-interval-2",
        "contains_polling:component:src/components/admin/social-week/WeekDetailPageView.tsx::WeekDetailPage:poll:src/components/admin/social-week/WeekDetailPageView.tsx::set-interval-1",
        "contains_polling:component:src/components/admin/social-week/WeekDetailPageView.tsx::WeekDetailPage:poll:src/components/admin/social-week/WeekDetailPageView.tsx::set-interval-2"
      ],
      "calls": [],
      "proxies_to": [
        "proxies_to:route:DELETE:/api/admin/covered-shows/[showId]:backend:DELETE:/api/v1/admin/covered-shows/[showId]",
        "proxies_to:route:DELETE:/api/admin/networks-streaming/overrides/[id]:backend:DELETE:/api/v1/admin/shows/networks-streaming/overrides/[id]",
        "proxies_to:route:DELETE:/api/admin/social-posts/[postId]:backend:DELETE:/api/v1/admin/social-posts/[postId]",
        "proxies_to:route:DELETE:/api/admin/trr-api/brands/logos/options/saved/[assetId]:backend:DELETE:/api/v1/admin/brands/logos/options/saved/[assetId]",
        "proxies_to:route:DELETE:/api/admin/trr-api/media-assets/[assetId]:backend:DELETE:/api/v1/admin/media-assets/[assetId]",
        "proxies_to:route:DELETE:/api/admin/trr-api/shows/[showId]/links/[linkId]:backend:DELETE:/api/v1/admin/shows/[showId]/links/[linkId]",
        "proxies_to:route:GET:/api/admin/covered-shows/[showId]:backend:GET:/api/v1/admin/covered-shows/[showId]",
        "proxies_to:route:GET:/api/admin/networks-streaming/overrides:backend:GET:/api/v1/admin/shows/networks-streaming/overrides",
        "proxies_to:route:GET:/api/admin/shows/[showKey]/icons:backend:GET:/api/v1/admin/shows/[showKey]/icons",
        "proxies_to:route:GET:/api/admin/social-posts/[postId]:backend:GET:/api/v1/admin/social-posts/[postId]",
        "proxies_to:route:GET:/api/admin/trr-api/brands/families:backend:GET:/api/v1/admin/brands/families",
        "proxies_to:route:GET:/api/admin/trr-api/brands/families/[familyId]/links:backend:GET:/api/v1/admin/brands/families/[familyId]/links",
        "proxies_to:route:GET:/api/admin/trr-api/brands/families/[familyId]/wikipedia-show-urls:backend:GET:/api/v1/admin/brands/families/[familyId]/wikipedia-show-urls",
        "proxies_to:route:GET:/api/admin/trr-api/brands/families/by-entity:backend:GET:/api/v1/admin/brands/families/by-entity",
        "proxies_to:route:GET:/api/admin/trr-api/brands/families/suggestions:backend:GET:/api/v1/admin/brands/families/suggestions",
        "proxies_to:route:GET:/api/admin/trr-api/brands/franchise-rules:backend:GET:/api/v1/admin/brands/franchise-rules",
        "proxies_to:route:GET:/api/admin/trr-api/brands/logo-targets:backend:GET:/api/v1/admin/brands/logo-targets",
        "proxies_to:route:GET:/api/admin/trr-api/brands/logos/options/modal:backend:GET:/api/v1/admin/brands/logos/options/modal",
        "proxies_to:route:GET:/api/admin/trr-api/brands/logos/options/source-suggestions:backend:GET:/api/v1/admin/brands/logos/options/source-suggestions",
        "proxies_to:route:GET:/api/admin/trr-api/brands/logos/options/sources:backend:GET:/api/v1/admin/brands/logos/options/sources",
        "proxies_to:route:GET:/api/admin/trr-api/bravotv/images/people/[personId]/latest:backend:GET:/api/v1/admin/bravotv/images/people/[personId]/latest",
        "proxies_to:route:GET:/api/admin/trr-api/bravotv/images/shows/[showId]/latest:backend:GET:/api/v1/admin/bravotv/images/shows/[showId]/latest",
        "proxies_to:route:GET:/api/admin/trr-api/operations/[operationId]:backend:GET:/api/v1/admin/operations/[operationId]",
        "proxies_to:route:GET:/api/admin/trr-api/operations/[operationId]/stream:backend:GET:/api/v1/admin/operations/[operationId]/stream",
        "proxies_to:route:GET:/api/admin/trr-api/operations/health:backend:GET:/api/v1/admin/operations/health",
        "proxies_to:route:GET:/api/admin/trr-api/people/[personId]/fandom:backend:GET:/api/v1/admin/person/[personId]/fandom",
        "proxies_to:route:GET:/api/admin/trr-api/people/[personId]/social-growth:backend:GET:/api/v1/admin/people/[personId]/socialblade",
        "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/bravo/news:backend:GET:/api/v1/admin/shows/[showId]/bravo/news",
        "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/bravo/videos:backend:GET:/api/v1/admin/shows/[showId]/bravo/videos",
        "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/cast-role-members:backend:GET:/api/v1/admin/shows/[showId]/cast-role-members",
        "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]:backend:GET:/api/v1/admin/shows/[showId]/google-news/sync/[jobId]",
        "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/links:backend:GET:/api/v1/admin/shows/[showId]/links",
        "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/news:backend:GET:/api/v1/admin/shows/[showId]/news",
        "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/roles:backend:GET:/api/v1/admin/shows/[showId]/roles",
        "proxies_to:route:GET:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom:backend:GET:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/fandom",
        "proxies_to:route:GET:/api/admin/trr-api/social/ingest/live-status/stream:backend:GET:/api/v1/admin/socials/live-status/stream",
        "proxies_to:route:PATCH:/api/admin/networks-streaming/overrides/[id]:backend:PATCH:/api/v1/admin/shows/networks-streaming/overrides/[id]",
        "proxies_to:route:PATCH:/api/admin/trr-api/brands/families/[familyId]:backend:PATCH:/api/v1/admin/brands/families/[familyId]",
        "proxies_to:route:PATCH:/api/admin/trr-api/brands/families/[familyId]/links/[ruleId]:backend:PATCH:/api/v1/admin/brands/families/[familyId]/links/[ruleId]`,\n    );\n    if (!backendUrl) return NextResponse.json({ error: \"Backend API not configured\" }, { status: 500 });\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) return NextResponse.json({ error: \"Backend auth not configured\" }, { status: 500 });\n\n    const body =\n      request.headers.get(\"content-type",
        "proxies_to:route:PATCH:/api/admin/trr-api/shows/[showId]/links/[linkId]:backend:PATCH:/api/v1/admin/shows/[showId]/links/[linkId]",
        "proxies_to:route:PATCH:/api/admin/trr-api/shows/[showId]/roles/[roleId]:backend:PATCH:/api/v1/admin/shows/[showId]/roles/[roleId]",
        "proxies_to:route:POST:/api/admin/networks-streaming/overrides:backend:POST:/api/v1/admin/shows/networks-streaming/overrides",
        "proxies_to:route:POST:/api/admin/networks-streaming/sync:backend:POST:/api/v1/admin/shows/sync-networks-streaming",
        "proxies_to:route:POST:/api/admin/scrape/import:backend:POST:/api/v1/admin/scrape/import",
        "proxies_to:route:POST:/api/admin/scrape/import/stream:backend:POST:/api/v1/admin/scrape/import/stream",
        "proxies_to:route:POST:/api/admin/scrape/preview:backend:POST:/api/v1/admin/scrape/preview",
        "proxies_to:route:POST:/api/admin/shows/[showKey]/icons:backend:POST:/api/v1/admin/shows/[showKey]/icons",
        "proxies_to:route:POST:/api/admin/trr-api/assets/archive:backend:POST:/api/v1/admin/assets/archive",
        "proxies_to:route:POST:/api/admin/trr-api/assets/content-type:backend:POST:/api/v1/admin/assets/content-type",
        "proxies_to:route:POST:/api/admin/trr-api/assets/star:backend:POST:/api/v1/admin/assets/star",
        "proxies_to:route:POST:/api/admin/trr-api/brands/families:backend:POST:/api/v1/admin/brands/families",
        "proxies_to:route:POST:/api/admin/trr-api/brands/families/[familyId]/links:backend:POST:/api/v1/admin/brands/families/[familyId]/links",
        "proxies_to:route:POST:/api/admin/trr-api/brands/families/[familyId]/links/apply:backend:POST:/api/v1/admin/brands/families/[familyId]/links/apply",
        "proxies_to:route:POST:/api/admin/trr-api/brands/families/[familyId]/members:backend:POST:/api/v1/admin/brands/families/[familyId]/members",
        "proxies_to:route:POST:/api/admin/trr-api/brands/families/[familyId]/wikipedia-import:backend:POST:/api/v1/admin/brands/families/[familyId]/wikipedia-import",
        "proxies_to:route:POST:/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/apply:backend:POST:/api/v1/admin/brands/franchise-rules/[franchiseKey]/apply",
        "proxies_to:route:POST:/api/admin/trr-api/brands/logos/options/assign:backend:POST:/api/v1/admin/brands/logos/options/assign",
        "proxies_to:route:POST:/api/admin/trr-api/brands/logos/options/discover:backend:POST:/api/v1/admin/brands/logos/options/discover",
        "proxies_to:route:POST:/api/admin/trr-api/brands/logos/options/select:backend:POST:/api/v1/admin/brands/logos/options/select",
        "proxies_to:route:POST:/api/admin/trr-api/brands/logos/options/source-query:backend:POST:/api/v1/admin/brands/logos/options/source-query",
        "proxies_to:route:POST:/api/admin/trr-api/brands/logos/sync:backend:POST:/api/v1/admin/brands/logos/sync",
        "proxies_to:route:POST:/api/admin/trr-api/bravotv/images/people/[personId]/stream:backend:POST:/api/v1/admin/bravotv/images/people/[personId]/stream",
        "proxies_to:route:POST:/api/admin/trr-api/bravotv/images/shows/[showId]/stream:backend:POST:/api/v1/admin/bravotv/images/shows/[showId]/stream",
        "proxies_to:route:POST:/api/admin/trr-api/cast-photos/[photoId]/auto-count:backend:POST:/api/v1/admin/cast-photos/[photoId]/auto-count",
        "proxies_to:route:POST:/api/admin/trr-api/cast-photos/[photoId]/detect-text-overlay:backend:POST:/api/v1/admin/cast-photos/[photoId]/detect-text-overlay",
        "proxies_to:route:POST:/api/admin/trr-api/cast-photos/[photoId]/mirror:backend:POST:/api/v1/admin/cast-photos/[photoId]/mirror",
        "proxies_to:route:POST:/api/admin/trr-api/cast-photos/[photoId]/variants:backend:POST:/api/v1/admin/cast-photos/[photoId]/variants",
        "proxies_to:route:POST:/api/admin/trr-api/media-assets/[assetId]/auto-count:backend:POST:/api/v1/admin/media-assets/[assetId]/auto-count",
        "proxies_to:route:POST:/api/admin/trr-api/media-assets/[assetId]/detect-text-overlay:backend:POST:/api/v1/admin/media-assets/[assetId]/detect-text-overlay",
        "proxies_to:route:POST:/api/admin/trr-api/media-assets/[assetId]/mirror:backend:POST:/api/v1/admin/media-assets/[assetId]/mirror",
        "proxies_to:route:POST:/api/admin/trr-api/media-assets/[assetId]/replace-from-url:backend:POST:/api/v1/admin/media-assets/[assetId]/replace-from-url",
        "proxies_to:route:POST:/api/admin/trr-api/media-assets/[assetId]/reverse-image-search:backend:POST:/api/v1/admin/media-assets/[assetId]/reverse-image-search",
        "proxies_to:route:POST:/api/admin/trr-api/media-assets/[assetId]/variants:backend:POST:/api/v1/admin/media-assets/[assetId]/variants",
        "proxies_to:route:POST:/api/admin/trr-api/operations/[operationId]/cancel:backend:POST:/api/v1/admin/operations/[operationId]/cancel",
        "proxies_to:route:POST:/api/admin/trr-api/operations/cancel:backend:POST:/api/v1/admin/operations/cancel",
        "proxies_to:route:POST:/api/admin/trr-api/operations/stale/cancel:backend:POST:/api/v1/admin/operations/stale/cancel",
        "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/import-fandom/commit:backend:POST:/api/v1/admin/person/[personId]/import-fandom/commit",
        "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/import-fandom/preview:backend:POST:/api/v1/admin/person/[personId]/import-fandom/preview",
        "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/refresh-images:backend:POST:/api/v1/admin/person/[personId]/refresh-images",
        "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment:backend:POST:/api/v1/admin/person/[personId]/refresh-images/getty-enrichment",
        "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/refresh-images/stream:backend:POST:/api/v1/admin/person/[personId]/refresh-images/stream",
        "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/refresh-profile/stream:backend:POST:/api/v1/admin/person/[personId]/refresh-profile/stream",
        "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/reprocess-images/stream:backend:POST:/api/v1/admin/person/[personId]/reprocess-images/stream",
        "proxies_to:route:POST:/api/admin/trr-api/people/[personId]/social-growth/refresh:backend:POST:/api/v1/admin/people/[personId]/socialblade/refresh",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream:backend:POST:/api/v1/admin/shows/[showId]/assets/batch-jobs/stream",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/auto-count-images:backend:POST:/api/v1/admin/shows/[showId]/auto-count-images",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails:backend:POST:/api/v1/admin/shows/[showId]/bravo/videos/sync-thumbnails",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/cast-matrix/sync:backend:POST:/api/v1/admin/shows/[showId]/cast-matrix/sync",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/cast/[personId]/roles:backend:POST:/api/v1/admin/shows/[showId]/cast/[personId]/roles",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/get-images/stream:backend:POST:/api/v1/admin/shows/[showId]/get-images/stream",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/google-news/sync:backend:POST:/api/v1/admin/shows/[showId]/google-news/sync",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/commit:backend:POST:/api/v1/admin/shows/[showId]/import-bravo/commit",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview:backend:POST:/api/v1/admin/shows/[showId]/import-bravo/preview",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream:backend:POST:/api/v1/admin/shows/[showId]/import-bravo/preview/stream",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/links:backend:POST:/api/v1/admin/shows/[showId]/links",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/links/add:backend:POST:/api/v1/admin/shows/[showId]/links/add",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/links/discover:backend:POST:/api/v1/admin/shows/[showId]/links/discover",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/links/discover/stream:backend:POST:/api/v1/admin/shows/[showId]/links/discover/stream",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/logos/featured:backend:POST:/api/v1/admin/shows/logos/set-primary",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/refresh-photos/stream:backend:POST:/api/v1/admin/shows/[showId]/refresh-photos/stream",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/refresh:backend:POST:/api/v1/admin/shows/[showId]/refresh",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/refresh/stream:backend:POST:/api/v1/admin/shows/[showId]/refresh/stream",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/refresh/target/[target]/retry:backend:POST:/api/v1/admin/shows/[showId]/refresh/target/[target]/retry`,\n    );\n    if (!backendUrl) {\n      return NextResponse.json(\n        { error: \"Backend API not configured\" },\n        { status: 500 },\n      );\n    }\n\n    const serviceRoleKey = getInternalAdminBearerToken();\n    if (!serviceRoleKey) {\n      return NextResponse.json(\n        { error: \"Backend auth not configured\" },\n        { status: 500 },\n      );\n    }\n\n    let body: Record<string, unknown> = {};\n    if (request.headers.get(\"content-type",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/roles:backend:POST:/api/v1/admin/shows/[showId]/roles",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream:backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit:backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
        "proxies_to:route:POST:/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview:backend:POST:/api/v1/admin/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
        "proxies_to:route:POST:/api/admin/trr-api/shows/sync-from-lists:backend:POST:/api/v1/admin/shows/sync-from-lists",
        "proxies_to:route:POST:/api/admin/trr-api/social-growth/refresh-batch:backend:POST:/api/v1/admin/people/socialblade/refresh-batch",
        "proxies_to:route:PUT:/api/admin/social-posts/[postId]:backend:PUT:/api/v1/admin/social-posts/[postId]",
        "proxies_to:route:PUT:/api/admin/trr-api/brands/franchise-rules/[franchiseKey]:backend:PUT:/api/v1/admin/brands/franchise-rules/[franchiseKey]"
      ],
      "touches_repository": [
        "touches_repository:backend:DELETE:/api/v1/admin/shows/networks-streaming/overrides/[id]:repo:src/lib/server/admin/networks-streaming-repository.ts::module",
        "touches_repository:backend:GET:/api/v1/admin/brands/families/by-entity:repo:src/lib/server/admin/brand-profile-repository.ts::module",
        "touches_repository:backend:GET:/api/v1/admin/shows/networks-streaming/overrides:repo:src/lib/server/admin/networks-streaming-repository.ts::module",
        "touches_repository:backend:PATCH:/api/v1/admin/shows/networks-streaming/overrides/[id]:repo:src/lib/server/admin/networks-streaming-repository.ts::module"
      ],
      "renders_view": []
    },
    "summary": {
      "totalNodes": 536,
      "totalEdges": 186,
      "nodesByKind": {
        "ui_surface": 58,
        "api_route": 361,
        "backend_endpoint": 111,
        "repository_surface": 2,
        "polling_loop": 4
      },
      "edgesByKind": {
        "originates_request": 67,
        "contains_polling": 4,
        "calls": 0,
        "proxies_to": 111,
        "touches_repository": 4,
        "renders_view": 0
      },
      "automaticNodes": 37,
      "pollingNodes": 37,
      "directPostgresNodes": 2,
      "indirectPostgresNodes": 133
    }
  }
} satisfies AdminApiReferenceInventory;
