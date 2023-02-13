export class Queue<T> {
  private elements: T[];

  constructor(initial?: T[]) {
    this.elements = initial ?? [];
  }

  enqueue(element: T) {
    this.elements.unshift(element);
  }

  enqueueBulk(elements: T[]) {
    this.elements.unshift(...elements);
  }

  dequeue() {
    return this.elements.pop();
  }

  peek() {
    return this.elements.length > 0 ? this.elements[0] : undefined;
  }

  get length() {
    return this.elements.length;
  }

  get isEmpty() {
    return this.length === 0;
  }
}
