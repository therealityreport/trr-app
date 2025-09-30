<template>
  <main class="wordle-app">
    <h1>Realitease Tile Flip Prototype</h1>
    <p class="wordle-board__status">
      Press <kbd>Enter</kbd> or use the button to reveal the next row. Tiles flip column by column.
    </p>
    <WordleBoard />
  </main>
</template>

<script lang="ts" setup>
import WordleBoard from "./components/WordleBoard.vue";
</script>
