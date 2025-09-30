<template>
  <div
    class="wordle-tile"
    :class="[stateClass, { revealed }]"
    :style="{ '--flip-delay': formatDelay(delay) }"
    role="presentation"
  >
    <div class="wordle-tile__inner">
      <div class="wordle-tile__face wordle-tile__face--front">
        <slot name="front">
          <span v-if="label" class="wordle-tile__label">{{ label }}</span>
          <span>{{ value }}</span>
        </slot>
      </div>
      <div class="wordle-tile__face wordle-tile__face--back">
        <slot name="back">
          <span v-if="label" class="wordle-tile__label">{{ label }}</span>
          <span>{{ value }}</span>
        </slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

type VerdictState =
  | "guess"
  | "correct"
  | "incorrect"
  | "partial"
  | "multi"
  | "alt"
  | "unknown";

const props = defineProps({
  value: {
    type: String,
    default: ""
  },
  label: {
    type: String,
    default: ""
  },
  verdict: {
    type: String as () => VerdictState,
    default: "unknown"
  },
  delay: {
    type: Number,
    default: 0
  },
  revealed: {
    type: Boolean,
    default: false
  }
});

const stateClass = computed(() => `wordle-tile--${props.verdict}`);

const formatDelay = (value: number) => `${Math.max(0, value).toFixed(3)}s`;
</script>
