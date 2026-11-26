import { describe, expect, it } from 'vitest';
import { clavePausa, sinRazonamiento } from '../src/memoria';

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

describe('clavePausa', () => {
  it('un eco a 52… pausa el mismo chat que escribe desde 521…', () => {
    expect(clavePausa('5215544704470')).toBe(clavePausa('525544704470'));
    expect(clavePausa('5215544704470')).toBe('pausa:525544704470');
  });
});
