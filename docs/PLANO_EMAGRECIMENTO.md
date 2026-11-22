# Plano Inteligente de Emagrecimento

A tela fica em `/app/plano-emagrecimento`. Ela tem links no Início ("Mais"), em Evolução e em Meu Plano.

O motor de cálculo está em `src/lib/calc/weightPlan.ts` e os testes em `tests/unit/weightPlan.test.ts`. O banco fica em `supabase/migrations/20261122000008_weight_plans.sql`, e os testes de banco em `tests/unit/rls.test.ts`.

## Princípios

- **Simulação ≠ plano.** A pessoa pode simular à vontade. Só vira **plano salvo** o cenário que passa em todos os bloqueios de segurança, verificados no cliente e também no banco.
- **Nunca é previsão garantida.** O app sempre mostra uma faixa (otimista–conservador) e o nível de confiança, que nunca é "alto".
- **Nada é diagnóstico nem prescrição.**

## Equações e hipóteses

| Item | Como calculamos | Fonte |
|---|---|---|
| Metabolismo de repouso (TMB) | Mifflin–St Jeor: 10·peso + 6,25·altura − 5·idade + s (s = +5 ou −161). Sem o parâmetro informado, usamos a média dos dois, com incerteza maior. | Mifflin et al., *Am J Clin Nutr* 1990 |
| Gasto diário (TDEE) | fator × peso × (horas de sono × 0,95 + horas acordado × MET habitual), com fator = TMB ÷ (peso × 24). O MET habitual depende do nível de atividade do perfil: 1,5 / 1,7 / 1,9 / 2,1. | Compendium of Physical Activities (Ainsworth et al., 2011; 2024) |
| Exercício | Soma só o **acréscimo**: (MET da atividade − MET habitual) × peso × horas × fator. O tempo do treino substitui o tempo habitual daquele horário, então nada é contado duas vezes. METs por intensidade: leve 3,0 · moderada 4,5 · intensa 7,0. | Compendium |
| Mudança de peso | Modelo **dinâmico semanal**: a cada semana o peso muda, a TMB e o gasto são recalculados com o novo peso, e uma termogênese adaptativa reduz o déficit (5%, 10% ou 15%, crescendo nas primeiras 8 semanas). | Hall et al., *Lancet* 2011; Rosenbaum & Leibel, 2010 |
| 7.700 kcal ≈ 1 kg | Serve só como densidade energética aproximada **dentro** do modelo dinâmico, nunca como regra fixa de previsão. O teste garante que o prazo do modelo é maior que o da regra fixa. | Wishnofsky, 1958; críticas em Hall 2008 |
| Faixa de incerteza | A trajetória otimista usa gasto +8% com adaptação de 5%. A conservadora usa gasto −8% com adaptação de 15%. Na amamentação, a variação sobe para ±12%. | — |
| Amamentação | O custo energético entra como **faixa**, não como valor a "compensar": exclusiva 300–600 kcal/dia, parcial 100–400, não informada 100–600. Isso só alarga a incerteza e nunca vira meta de ingestão. | IOM/NASEM, *Dietary Reference Intakes for Energy* (2023) |
| Tendência observada | Média móvel de 7 dias e regressão linear das últimas 6 semanas. Exige pelo menos 3 pesagens cobrindo pelo menos 14 dias, para que variações isoladas (água, ciclo, sono) não gerem conclusão. | — |
| Confiança | "Baixa", "moderada" ou "boa", conforme as pesagens dos últimos 28 dias, os dias com alimentação registrada nos últimos 14 dias e se o parâmetro da equação foi informado. Em lactantes é sempre "baixa". | — |

## Bloqueios de segurança

Um cenário **não pode virar plano** quando acontece qualquer um destes casos:

1. A triagem não permite perda de peso: menor de 18 anos, gestante, histórico ou suspeita de transtorno alimentar, triagem incompleta ou IMC abaixo de 18,5. Nesses casos a tela nem mostra o simulador.
2. A pessoa é lactante. Nesse caso o simulador é **apenas informativo** e não existe botão de salvar.
3. A ingestão fica abaixo de max(1.200 kcal, TMB estimada).
4. O ritmo inicial de perda passa de 1% do peso por semana.
5. O peso desejado corresponde a IMC abaixo de 18,5.
6. Há treino intenso em mais de 5 dias por semana (sem recuperação).
7. O volume passa de 600 min/semana, ou há sessões intensas de mais de 90 min.
8. Foram registrados sinais de alerta nos últimos 7 dias: tontura, cansaço intenso, fome constante ou mudança percebida na amamentação. As recomendações ficam pausadas e o app orienta avaliação profissional.

O banco reforça os itens 1 e 2 com o gatilho `enforce_weight_plan_rules`, que usa `screening_flags`. Os limites de 1.200 kcal, recuperação e volume são restrições `check`. Fica permitido só um plano aberto por pessoa, e o RLS isola os dados de cada usuário.

## Reavaliação

- As projeções são recalculadas a cada abertura da tela, com o peso mais recente, a média de ingestão dos últimos 14 dias e a média de sono.
- O plano pode ser **pausado**, posto em **manutenção**, **retomado** ou **encerrado**, sem penalidade. Mudar a meta cria um novo plano e encerra o anterior.

## Limitações

- As equações populacionais têm erro individual de ±10% ou mais.
- O modelo dinâmico é uma simplificação: não separa massa magra de gordura nem modela água e glicogênio.
- A ingestão registrada costuma ser subestimada.
- A projeção depende da constância dos registros.
