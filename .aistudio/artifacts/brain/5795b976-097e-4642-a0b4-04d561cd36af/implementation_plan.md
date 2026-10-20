# Informações sobre o Limite Diário de Cota no Google AI Studio Build

Este documento explica os motivos pelos quais o aviso de **limite diário de requisições** pode ser exibido mesmo antes de você ter enviado novas mensagens no seu dia local, e orienta sobre como proceder.

---

## 1. Por que o limite diário foi atingido se você não usou hoje?

### A. Fuso Horário de Reinício da Cota (Midnight Pacific Time / UTC)
* As cotas diárias de modelos no **Google AI Studio** (**RPD** - *Requests Per Day*) **não reiniciam à meia-noite do seu horário local** (Horário de Brasília, UTC-3).
* O ciclo oficial de 24 horas do Google reinicia diariamente à **meia-noite do Horário do Pacífico dos EUA (PST/PDT)**, ou às **00:00 UTC**.
* Para quem está no Brasil, a virada do dia do servidor acontece por volta de **04:00 ou 05:00 da manhã** (dependendo do horário de verão americano).
* Se você interagiu com o assistente na tarde ou noite de ontem, essas requisições **ainda estavam contabilizadas** na mesma janela de 24 horas do servidor do Google.

### B. Consumo Acumulado por Turno de Construção
* Cada interação no AI Studio Build envolve o envio do contexto completo do projeto, leitura de arquivos, checagem de regras e validação de compilação.
* Sessões recentes com múltiplos testes (como a depuração da FIDE, verificações de arquivos e ajustes de tabelas) consomem um volume considerável de chamadas da API do modelo (`gemini-3.8-flash`).

### C. Cota Compartilhada por Conta Google
* A cota diária do plano gratuito é associada à conta Google (`machadoapoena@gmail.com`).
* Caso você tenha outras abas abertas, projetos ou testes de API usando a mesma conta, todas as requisições compartilham o mesmo limite diário.

---

## 2. Como prosseguir

1. **Aguardar a Renovação da Janela:**
   * O contador zera automaticamente a cada 24 horas (no ciclo do Google).
2. **Ativação de Faturamento (Pay-As-You-Go):**
   * No Google AI Studio, vincular um projeto de faturamento do Google Cloud remove as restrições rígidas da camada gratuita.
   * Modelos da família Flash possuem custo muito baixo (centavos por milhão de tokens).
3. **Boas Práticas de Economia de Cota:**
   * Agrupar solicitações em comandos objetivos e claros.
   * Evitar reiniciar conversas do zero repetidamente para não reenviar históricos redundantes.
