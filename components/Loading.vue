<template>
  <div class="c-loader-container">
    <div class="c-loader"></div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.c-loader-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 40px 0;
}
/* https://cssloaders.github.io/ */
.c-loader {
  width: 48px;
  height: 48px;
  border: 3px solid #fff;
  border-radius: 50%;
  display: inline-block;
  position: relative;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}
.c-loader::after {
  content: '';
  box-sizing: border-box;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-bottom-color: #1fa0a2;
}

@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
