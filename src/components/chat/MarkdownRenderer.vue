<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{ source: string }>()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const html = computed(() => md.render(props.source ?? ''))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html — html:false en markdown-it, contenido sanitizado -->
  <div class="markdown" v-html="html" />
</template>

<style scoped>
.markdown :deep(p) {
  margin: 0 0 0.5rem;
}

.markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-size: 0.9em;
}

.markdown :deep(pre) {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.75rem;
  border-radius: 8px;
  overflow-x: auto;
}

.markdown :deep(table) {
  display: block;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 0.5rem 0;
}

.markdown :deep(th),
.markdown :deep(td) {
  border: 1px solid var(--color-border);
  padding: 0.35rem 0.6rem;
  text-align: left;
}
</style>
