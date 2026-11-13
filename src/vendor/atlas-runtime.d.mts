export function mountAtlas(deck: HTMLElement, initial: number, onChange: (index: number) => void): {
  advance(direction: number): void
  goTo(index: number): void
  destroy(): void
}
