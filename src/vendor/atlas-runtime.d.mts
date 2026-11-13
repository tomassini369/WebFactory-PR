export function mountAtlas(deck: HTMLElement, initial: number, onChange: (index: number) => void): {
  beginDrag(): void
  drag(offset: number): void
  endDrag(direction: number): void
  advance(direction: number): void
  goTo(index: number): void
  destroy(): void
}
