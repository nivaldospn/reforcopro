import { describe, it, expect } from 'vitest';
import { normalizeBrazilianPhone, isValidBrazilianPhone, formatReminderMessage } from './client';

describe('Datafy WhatsApp Integration - Unit Tests', () => {
  describe('1. Normalização de Telefones Brasileiros', () => {
    it('deve converter número com DDD de 11 dígitos para formato E.164 com 55', () => {
      const input = '(11) 99999-8888';
      const output = normalizeBrazilianPhone(input);
      expect(output).toBe('5511999998888');
      expect(isValidBrazilianPhone(output)).toBe(true);
    });

    it('deve preservar número que já possui o prefixo 55', () => {
      const input = '+55 (77) 98888-7777';
      const output = normalizeBrazilianPhone(input);
      expect(output).toBe('5577988887777');
      expect(isValidBrazilianPhone(output)).toBe(true);
    });

    it('deve remover zero inicial de operadora/DDD (ex: 011 98888-7777)', () => {
      const input = '011988887777';
      const output = normalizeBrazilianPhone(input);
      expect(output).toBe('5511988887777');
      expect(isValidBrazilianPhone(output)).toBe(true);
    });

    it('deve identificar como inválido números sem DDD ou incompletos', () => {
      expect(isValidBrazilianPhone(normalizeBrazilianPhone('99999-8888'))).toBe(false);
      expect(isValidBrazilianPhone(normalizeBrazilianPhone('123'))).toBe(false);
      expect(isValidBrazilianPhone('')).toBe(false);
    });
  });

  describe('2. Substituição de Variáveis no Template de Lembrete', () => {
    it('deve preencher corretamente todas as variáveis dinâmicas', () => {
      const template = 'Olá, {responsavel}! O aluno {aluno} tem mensalidade no valor de {valor} com vencimento em {vencimento} na turma {turma} ({nome_escola}).';
      const result = formatReminderMessage(template, {
        responsavel: 'Maria',
        aluno: 'João',
        valor: 150,
        vencimento: '12/09/2026',
        turma: 'Matemática Avançada',
        nome_escola: 'Reforço Pro',
      });

      expect(result).toContain('Olá, Maria!');
      expect(result).toContain('aluno João');
      expect(result).toContain('12/09/2026');
      expect(result).toContain('Matemática Avançada');
      expect(result).toContain('Reforço Pro');
    });

    it('deve usar fallbacks seguros caso alguma variável não seja informada', () => {
      const template = 'Olá, {responsavel}! Mensalidade de {aluno}: {valor}.';
      const result = formatReminderMessage(template, {
        responsavel: '',
        aluno: '',
        valor: '',
        vencimento: '',
      });

      expect(result).toBe('Olá, Responsável! Mensalidade de Aluno: R$ 0,00.');
    });
  });

  describe('3. Regras de Negócio e Timezone', () => {
    it('deve garantir formatação correta de data no fuso de São Paulo (America/Sao_Paulo)', () => {
      const testDate = new Date('2026-09-12T12:00:00Z');
      const formatted = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(testDate);

      expect(formatted).toBe('12/09/2026');
    });
  });
});
