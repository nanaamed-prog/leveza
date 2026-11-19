# Fórmulas, modelos e fontes

Todas as funções ficam em `src/lib/calc/` e têm testes em `tests/unit/`.

## IMC (adultos) — `bmi.ts`
`IMC = peso_kg / (altura_m)²`. Categorias (OMS): < 18,5 baixo peso · 18,5 a < 25 faixa saudável · 25 a < 30 sobrepeso · ≥ 30 obesidade (classes I/II/III opcionais). A classificação usa o valor **sem arredondar** (24,96 exibe "25,0" mas segue na faixa saudável). Não se aplica a menores de 18 anos. É indicador de triagem: não mede composição corporal nem é diagnóstico. A faixa de peso para IMC 18,5–24,9 é mostrada como referência populacional, nunca como "peso ideal".

## Macronutrientes — `macros.ts`
kcal: proteína g×4, carboidrato g×4, gordura g×9 (fatores gerais de Atwater). Percentual = kcal do macro ÷ (soma das kcal dos três) × 100, arredondado pelo método do maior resto para somar 100. Sem dados → nenhum percentual é exibido. O total de kcal de uma tabela pode diferir da soma dos macros por fibras, álcool (7 kcal/g), polióis, fatores específicos e arredondamentos. O app mostra o macronutriente **predominante** sem classificar alimentos como "só proteína" ou "só carboidrato".

## Metabolismo basal — `bmr.ts`
Mifflin–St Jeor (1990): `10×peso + 6,25×altura − 5×idade + s`, com `s = +5` (parâmetro masculino) ou `−161` (parâmetro feminino). A pessoa escolhe o parâmetro ou "prefiro não informar" — nesse caso usamos o ponto médio e mostramos a **faixa** entre as duas equações (±10%). Nunca inferimos o parâmetro por aparência, nome ou identidade. Erro individual típico ≥ ±10%; menos precisa em atletas, obesidade grave, idosos e condições clínicas.

## Gasto diário sem dupla contagem — `energy.ts`
Modelo de **linha do tempo** com períodos mutuamente exclusivos dentro do dia local (inclusive dias de 23 h/25 h por horário de verão):
1. Sono registrado → MET 0,95 (minutos acordado na cama → MET 1,0)
2. Atividades registradas → MET da modalidade/intensidade
3. Restante do tempo acordado → MET basal do nível habitual (sedentário 1,5 · leve 1,7 · moderado 1,9 · ativo 2,1)

`kcal = Σ(MET × peso × horas) × fator`, onde `fator = TMB ÷ (peso × 24)` ajusta a convenção "MET 1 ≈ 1 kcal/kg/h" à TMB individual.

Garantias (testadas): cada minuto recebe **um único** MET; uma atividade **substitui** o tempo basal (o MET já inclui o repouso); sobreposições usam o maior MET do instante e são reportadas; passos de pedômetro não são somados; "gasto até agora" é separado da "projeção 24 h". **Nunca** somamos TMB + TDEE + exercício + sono.

Saldo = consumido − gasto estimado até agora. Texto neutro; sem recompensa por déficit.

## Metas — `weight.ts`
- Peso desejado com IMC < 18,5 → meta bloqueada com explicação.
- Ritmo > 1% do peso/semana → aviso.
- Sugestão de ingestão (só se a triagem permitir déficit): até 15% abaixo da projeção, nunca abaixo da TMB estimada nem de 1.200 kcal. O banco também rejeita metas < 1.200 kcal.

## MET das atividades — `met.ts`
Valores aproximados inspirados no *Compendium of Physical Activities* (Ainsworth et al., 2011; atualização 2024). Médias populacionais; editáveis pela pessoa.

## Base nutricional — `src/lib/nutrition/foods.ts`
98 alimentos comuns no Brasil (incluindo preparações do dia a dia), por 100 g/ml, com **valores aproximados de referência** montados a partir de valores típicos da TACO (NEPA/UNICAMP, 4ª ed., 2011) e do USDA FoodData Central. Cada item salvo registra `nutrition_source` e `source_consulted_at`.

**Antes do lançamento:** importar os valores diretamente das fontes oficiais, respeitando as licenças:
- **TBCA** (USP/FoRC) — verificar termos de uso para aplicativos.
- **TACO** — publicação do NEPA/UNICAMP; conferir permissão de reprodução.
- **USDA FoodData Central** — domínio público (CC0); API gratuita com chave.

O teste `foods.test.ts` confere que as kcal de cada item são coerentes com os macros (tolerância para fibras e fatores específicos).

## Jejum — `fasting.ts`
Apenas cálculo de tempo. A linha do tempo educativa é qualitativa e não afirma horários exatos para cetose, autofagia ou "queima de gordura".
