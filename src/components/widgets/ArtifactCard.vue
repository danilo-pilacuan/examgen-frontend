<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps<{
  kind: 'pdf' | 'csv' | 'xlsx' | 'json' | 'zip'
  url: string
  filename: string
  version?: number
}>()

const icon = computed(() => {
  if (props.kind === 'pdf') return '📄'
  if (props.kind === 'xlsx') return '📊'
  if (props.kind === 'json') return '🧾'
  if (props.kind === 'zip') return '📦'
  return '📈'
})

const label = computed(() => {
  if (props.kind === 'pdf') return 'PDF'
  if (props.kind === 'xlsx') return 'Excel'
  if (props.kind === 'json') return 'JSON'
  if (props.kind === 'zip') return 'ZIP'
  return 'CSV'
})
</script>

<template>
  <div class="artifact-card">
    <span class="icon">{{ icon }}</span>
    <div class="info">
      <span class="label">{{ label }}<template v-if="version"> · v{{ version }}</template></span>
      <span class="filename">{{ filename }}</span>
    </div>
    <a :href="url" download class="download">⬇️ {{ t('artifact.download') }}</a>
  </div>
</template>

<style scoped>
.artifact-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.7rem 0.9rem;
  background: var(--color-surface);
  margin: 0.5rem 0;
}

.icon {
  font-size: 1.5rem;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.label {
  font-weight: 600;
  font-size: 0.9rem;
}

.filename {
  font-size: 0.78rem;
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.download {
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  padding: 0.35rem 0.8rem;
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.85rem;
  white-space: nowrap;
}

.download:hover {
  background: rgba(37, 99, 235, 0.08);
}
</style>
