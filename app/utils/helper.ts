let lastTime = 0;

export function startTime() {
  lastTime = +new Date();
}

export function showCostTime(text: string) {
  console.log(text, +new Date() - lastTime);
  lastTime = +new Date();
}