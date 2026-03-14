<template>
  <div
    :style="{
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      background: '#fcfbf7',
      fontFamily: 'Geist, sans-serif',
      overflow: 'hidden',
    }"
  >
    <!-- Dot grid -->
    <div
      :style="{
        position: 'absolute',
        inset: '0',
        opacity: '0.06',
        backgroundImage: 'radial-gradient(circle, rgba(0, 220, 130, 0.9) 0.5px, transparent 0.5px)',
        backgroundSize: '32px 32px',
      }"
    />

    <!-- Gradient overlay -->
    <div
      :style="{
        position: 'absolute',
        inset: '0',
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0, 220, 130, 0.06) 0%, transparent 100%)',
      }"
    />

    <!-- Content -->
    <div
      :style="{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
      }"
    >
      <div
        :style="{
          padding: '4px 14px',
          borderRadius: '9999px',
          background: 'rgba(0, 220, 130, 0.08)',
          border: '1px solid rgba(0, 220, 130, 0.18)',
          fontSize: '13px',
          color: '#00a86b',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: '500',
        }"
      >
        nuxt-skill-hub
      </div>

      <div
        :style="{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          lineHeight: '1.1',
        }"
      >
        <span :style="{ fontSize: '72px', fontWeight: '700', color: '#161616', letterSpacing: '-0.025em' }">
          Teach your AI agent
        </span>
        <span :style="{ fontSize: '72px', fontWeight: '700', color: '#00dc82', letterSpacing: '-0.025em' }">
          Nuxt.
        </span>
      </div>

      <div
        :style="{
          fontSize: '20px',
          color: '#6b7280',
          maxWidth: '640px',
          textAlign: 'center',
          lineHeight: '1.5',
        }"
      >
        Best practices, module APIs, and patterns for every Nuxt module in your project.
      </div>

      <div
        :style="{
          marginTop: '8px',
          padding: '10px 24px',
          borderRadius: '9999px',
          background: 'rgba(255,255,255,0.85)',
          border: '1px solid rgba(15, 23, 42, 0.1)',
          fontSize: '15px',
          color: '#374151',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: '500',
        }"
      >
        npx nuxt module add nuxt-skill-hub
      </div>
    </div>
  </div>
</template>
