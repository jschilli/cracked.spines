<template>
  <header class="mb-8">
    <h1 class="text-3xl font-bold mb-4">Camp Lake James Mens Book Club</h1>
    <nav class="flex flex-wrap gap-4 mb-8 border-b-2 border-gray-200 pb-6">
      <NuxtLink 
        to="/all"
        class="px-4 py-2 rounded-lg border-2 border-gray-300 bg-gray-100 hover:bg-gray-300 transition-colors"
        :class="{ 'bg-gray-300': route.path === '/all' }"
      >
        All Books
      </NuxtLink>
      <NuxtLink 
        v-for="(displayName, status) in statusMap" 
        :key="status"
        :to="'/' + status.toLowerCase()"
        class="px-4 py-2 rounded-lg border-2 border-gray-300 bg-gray-100 hover:bg-gray-300 transition-colors"
        :class="{ 'bg-gray-300': route.path === '/' + status.toLowerCase() }"
      >
        {{ displayName }}
      </NuxtLink>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const statusMap = {
  'Selected': 'Upcoming',
  'Candidate': 'Candidates',
  'Read': 'Read',
  'Relegated': 'Relegated'
};
</script> 