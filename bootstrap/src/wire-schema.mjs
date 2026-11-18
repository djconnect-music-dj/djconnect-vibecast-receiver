// Exact selected closed definitions from API implementation.1; see docs/contracts.
export const definitions = {
  "v": {
    "const": "djc-rendezvous/1"
  },
  "transaction_id": {
    "type": "string",
    "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
  },
  "generation": {
    "type": "integer",
    "minimum": 1,
    "maximum": 2147483647
  },
  "time": {
    "type": "integer",
    "minimum": 0,
    "maximum": 9007199254740991
  },
  "opaque": {
    "type": "string",
    "pattern": "^[A-Za-z0-9_-]{43}$"
  },
  "public_key": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "kty": {
        "const": "RSA"
      },
      "n": {
        "type": "string",
        "pattern": "^[A-Za-z0-9_-]{342}$"
      },
      "e": {
        "const": "AQAB"
      }
    },
    "required": [
      "kty",
      "n",
      "e"
    ]
  },
  "jwe": {
    "type": "string",
    "maxLength": 8192,
    "pattern": "^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]{342}\\.[A-Za-z0-9_-]{16}\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]{22}$"
  },
  "qr_payload": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "type": {
        "const": "djc-rendezvous-qr"
      },
      "v": {
        "$ref": "#/$defs/v"
      },
      "service_origin": {
        "const": "https://api.djconnect.dev"
      },
      "transaction_id": {
        "$ref": "#/$defs/transaction_id"
      },
      "generation": {
        "$ref": "#/$defs/generation"
      },
      "expires_at": {
        "$ref": "#/$defs/time"
      },
      "browser_key_thumbprint": {
        "$ref": "#/$defs/opaque"
      },
      "qr_capability": {
        "$ref": "#/$defs/opaque"
      }
    },
    "required": [
      "type",
      "v",
      "service_origin",
      "transaction_id",
      "generation",
      "expires_at",
      "browser_key_thumbprint",
      "qr_capability"
    ]
  },
  "create": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "v": {
        "$ref": "#/$defs/v"
      },
      "generation": {
        "$ref": "#/$defs/generation"
      },
      "browser_public_key": {
        "$ref": "#/$defs/public_key"
      },
      "claim_commitment": {
        "$ref": "#/$defs/opaque"
      }
    },
    "required": [
      "v",
      "generation",
      "browser_public_key",
      "claim_commitment"
    ]
  },
  "create_response": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "v": {
        "$ref": "#/$defs/v"
      },
      "transaction_id": {
        "$ref": "#/$defs/transaction_id"
      },
      "generation": {
        "$ref": "#/$defs/generation"
      },
      "created_at": {
        "$ref": "#/$defs/time"
      },
      "expires_at": {
        "$ref": "#/$defs/time"
      },
      "browser_key_thumbprint": {
        "$ref": "#/$defs/opaque"
      },
      "qr_payload": {
        "$ref": "#/$defs/qr_payload"
      }
    },
    "required": [
      "v",
      "transaction_id",
      "generation",
      "created_at",
      "expires_at",
      "browser_key_thumbprint",
      "qr_payload"
    ]
  },
  "poll": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "v": {
        "$ref": "#/$defs/v"
      },
      "transaction_id": {
        "$ref": "#/$defs/transaction_id"
      },
      "generation": {
        "$ref": "#/$defs/generation"
      },
      "claim_secret": {
        "$ref": "#/$defs/opaque"
      }
    },
    "required": [
      "v",
      "transaction_id",
      "generation",
      "claim_secret"
    ]
  },
  "poll_response": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "v": {
        "$ref": "#/$defs/v"
      },
      "state": {
        "enum": [
          "pending",
          "ready",
          "consumed",
          "cancelled"
        ]
      },
      "expires_at": {
        "$ref": "#/$defs/time"
      },
      "retry_after_ms": {
        "type": "integer",
        "minimum": 0,
        "maximum": 120000
      }
    },
    "required": [
      "v",
      "state",
      "expires_at",
      "retry_after_ms"
    ]
  },
  "consume": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "v": {
        "$ref": "#/$defs/v"
      },
      "transaction_id": {
        "$ref": "#/$defs/transaction_id"
      },
      "generation": {
        "$ref": "#/$defs/generation"
      },
      "claim_secret": {
        "$ref": "#/$defs/opaque"
      }
    },
    "required": [
      "v",
      "transaction_id",
      "generation",
      "claim_secret"
    ]
  },
  "consume_response": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "v": {
        "$ref": "#/$defs/v"
      },
      "state": {
        "const": "consumed"
      },
      "destination_envelope": {
        "$ref": "#/$defs/jwe"
      },
      "expires_at": {
        "$ref": "#/$defs/time"
      }
    },
    "required": [
      "v",
      "state",
      "destination_envelope",
      "expires_at"
    ]
  },
  "cancel": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "v": {
        "$ref": "#/$defs/v"
      },
      "transaction_id": {
        "$ref": "#/$defs/transaction_id"
      },
      "generation": {
        "$ref": "#/$defs/generation"
      },
      "claim_secret": {
        "$ref": "#/$defs/opaque"
      }
    },
    "required": [
      "v",
      "transaction_id",
      "generation",
      "claim_secret"
    ]
  },
  "cancel_response": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "v": {
        "$ref": "#/$defs/v"
      },
      "state": {
        "const": "cancelled"
      }
    },
    "required": [
      "v",
      "state"
    ]
  },
  "error": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "v": {
        "$ref": "#/$defs/v"
      },
      "error": {
        "enum": [
          "invalid_request",
          "unsupported_version",
          "invalid_capability",
          "invalid_sender_proof",
          "attestation_required",
          "app_not_supported",
          "origin_denied",
          "operation_conflict",
          "already_submitted",
          "already_consumed",
          "cancelled",
          "not_ready",
          "expired",
          "payload_too_large",
          "unsupported_content_type",
          "rate_limited",
          "attestation_unavailable",
          "service_unavailable"
        ]
      },
      "retry_after_ms": {
        "type": "integer",
        "minimum": 1,
        "maximum": 120000
      }
    },
    "required": [
      "v",
      "error"
    ]
  }
};
