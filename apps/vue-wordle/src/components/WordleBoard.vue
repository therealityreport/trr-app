<template>
  <section class="wordle-board">
    <div class="wordle-board__grid" role="grid" aria-label="Realitease flip board">
      <article v-for="(row, rowIndex) in board" :key="`row-${rowIndex}`" class="wordle-board__row" role="row">
        <WordleTile
          v-for="(tile, columnIndex) in row"
          :key="`row-${rowIndex}-col-${columnIndex}`"
          :value="tile.value"
          :label="tile.label"
          :verdict="tile.verdict"
          :delay="tile.delay"
          :revealed="tile.revealed"
        />
      </article>
    </div>

    <div class="wordle-board__controls">
      <button type="button" @click="revealNextRow" :disabled="!canReveal">Flip Next Row</button>
      <button type="button" @click="resetBoard">Reset</button>
    </div>

    <p class="wordle-board__status">{{ statusMessage }}</p>

    <div class="wordle-board__legend" aria-hidden="true">
      <span style="color: #60811f"><span class="wordle-board__swatch"></span>Correct</span>
      <span style="color: #eac408"><span class="wordle-board__swatch"></span>Close (±5 years)</span>
      <span style="color: #890207"><span class="wordle-board__swatch"></span>Incorrect</span>
      <span style="color: #28578a"><span class="wordle-board__swatch"></span>Multiple matches</span>
      <span style="color: #644072"><span class="wordle-board__swatch"></span>Alternate data</span>
      <span style="color: #6c7789"><span class="wordle-board__swatch"></span>Unknown</span>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import WordleTile from "./WordleTile.vue";

type Verdict = "guess" | "correct" | "incorrect" | "partial" | "multi" | "alt" | "unknown";

interface TileState {
  value: string;
  label: string;
  verdict: Verdict;
  revealed: boolean;
  delay: number;
}

type RowState = TileState[];

const columnLabels = ["GUESS", "GENDER", "AGE", "NETWORK", "SHOWS", "WWHL"];

const sampleRows: Array<Array<{ value: string; verdict: Verdict }>> = [
  [
    { value: "KENYA", verdict: "guess" },
    { value: "F", verdict: "correct" },
    { value: "53", verdict: "partial" },
    { value: "BRAVO", verdict: "correct" },
    { value: "RHOA", verdict: "multi" },
    { value: "5", verdict: "incorrect" }
  ],
  [
    { value: "PORSHA", verdict: "guess" },
    { value: "F", verdict: "correct" },
    { value: "42", verdict: "partial" },
    { value: "BRAVO", verdict: "correct" },
    { value: "RHOA", verdict: "multi" },
    { value: "4", verdict: "incorrect" }
  ],
  [
    { value: "KANDI", verdict: "guess" },
    { value: "F", verdict: "correct" },
    { value: "48", verdict: "partial" },
    { value: "BRAVO", verdict: "correct" },
    { value: "RHOA", verdict: "multi" },
    { value: "12", verdict: "correct" }
  ],
  [
    { value: "GIZELLE", verdict: "guess" },
    { value: "F", verdict: "correct" },
    { value: "53", verdict: "incorrect" },
    { value: "BRAVO", verdict: "correct" },
    { value: "RHOP", verdict: "incorrect" },
    { value: "3", verdict: "incorrect" }
  ],
  [
    { value: "NENE", verdict: "guess" },
    { value: "F", verdict: "correct" },
    { value: "57", verdict: "partial" },
    { value: "BRAVO", verdict: "correct" },
    { value: "RHOA", verdict: "multi" },
    { value: "5", verdict: "incorrect" }
  ],
  [
    { value: "PHAEDRA", verdict: "guess" },
    { value: "F", verdict: "correct" },
    { value: "51", verdict: "correct" },
    { value: "BRAVO", verdict: "correct" },
    { value: "RHOA", verdict: "multi" },
    { value: "2", verdict: "alt" }
  ]
];

const createBoardState = (): RowState[] =>
  sampleRows.map((row, rowIndex) =>
    row.map((tile, columnIndex) => ({
      value: tile.value,
      label: rowIndex === 0 ? columnLabels[columnIndex] ?? "" : "",
      verdict: tile.verdict,
      revealed: false,
      delay: 0
    }))
  );

const board = ref<RowState[]>(createBoardState());
const currentRow = ref(0);
const statusMessage = ref("Waiting for Enter...");

const canReveal = computed(() => currentRow.value < board.value.length);

const revealNextRow = () => {
  if (!canReveal.value) {
    statusMessage.value = "All rows revealed.";
    return;
  }

  const row = board.value[currentRow.value];
  row.forEach((tile, columnIndex) => {
    tile.delay = columnIndex * 0.3;
    tile.revealed = true;
  });

  currentRow.value += 1;

  if (currentRow.value >= board.value.length) {
    statusMessage.value = "Puzzle complete.";
  } else {
    statusMessage.value = `Row ${currentRow.value} revealed.`;
  }
};

const resetBoard = () => {
  board.value = createBoardState();
  currentRow.value = 0;
  statusMessage.value = "Board reset. Waiting for Enter...";
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.preventDefault();
    revealNextRow();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>
