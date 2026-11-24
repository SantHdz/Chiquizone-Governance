import { describe, expect, it } from 'vitest';
import { sinRazonamiento } from '../src/memoria';

describe('sinRazonamiento', () => {
  it('quita el razonamiento firmado y deja texto y herramientas', () => {
    const limpios = sinRazonamiento([
      { role: 'user', content: 'hola' },
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'pienso', signature: 'firma' },
          { type: 'text', text: '¡Hola!' },
          { type: 'tool_use', id: 't1', name: 'cotizar', input: {} },
        ],
      },
      { role: 'assistant', content: [{ type: 'redacted_thinking', data: 'x' }] },
    ]);
    expect(limpios).toHaveLength(2);
    expect(JSON.stringify(limpios)).not.toContain('thinking');
    expect(limpios[1].content).toHaveLength(2);
  });
});
