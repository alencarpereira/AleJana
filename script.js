// VARIÁVEL GLOBAL PARA GUARDAR A ANÁLISE PRÉ-JOGO
let dadosPreJogoCalculados = null;

document.addEventListener("DOMContentLoaded", () => {
    const btnAnalisarPre = document.getElementById("btnAnalisarPre");
    const btnAnalisarLive = document.getElementById("btnAnalisarLive");
    const btnPreencher = document.getElementById("btnPreencher");
    const btnLimpar = document.getElementById("btnLimpar");

    if (btnAnalisarPre) btnAnalisarPre.addEventListener("click", analisarApenasH2H);
    if (btnAnalisarLive) btnAnalisarLive.addEventListener("click", dispararAnaliseLive);
    if (btnPreencher) btnPreencher.addEventListener("click", preencherAutomatico);
    if (btnLimpar) btnLimpar.addEventListener("click", limparFormulario);
});

// FUNÇÃO ÚNICA E ATUALIZADA DE AJUSTE DE COMPETIÇÃO
function aplicarAjusteCompeticao(btts, over25, probEmpate, probVitoriaCasa = 0, tipoCompeticao = "liga") {
    let bttsAjustado = btts;
    let over25Ajustado = over25;
    let empateAjustado = probEmpate;
    let casaAjustado = probVitoriaCasa;

    if (tipoCompeticao === "matamata") {
        // Redução leve em gols (jogos estudados/truncados)
        bttsAjustado = Math.round(btts * 0.93);
        over25Ajustado = Math.round(over25 * 0.95);

        // Aumento do Empate (jogos muito parelhos)
        empateAjustado = Math.min(90, Math.round(probEmpate * 1.10));

        // BÔNUS MANDO DE CAMPO: Impulso de 8% no Mandante para o Mata-Mata
        casaAjustado = Math.min(95, Math.round(probVitoriaCasa * 1.08));
    } else {
        // PONTOS CORRIDOS (Liga mantém o padrão)
        bttsAjustado = Math.min(95, Math.round(btts * 1.05));
        over25Ajustado = Math.min(95, Math.round(over25 * 1.05));
    }

    return {
        btts: bttsAjustado,
        over25: over25Ajustado,
        empate: empateAjustado,
        vitoriaCasa: casaAjustado
    };
}

// --- 1. ETAPA PRÉ-JOGO (CALCULA E GUARDA O ESTADO) ---
// --- 1. ETAPA PRÉ-JOGO (CALCULA E GUARDA O ESTADO) ---
function analisarApenasH2H() {
    const nomeTimeA = document.getElementById("timeA")?.value.trim() || "Time A";
    const nomeTimeB = document.getElementById("timeB")?.value.trim() || "Time B";
    const tipoCompeticao = document.getElementById("tipoCompeticao")?.value || "liga";

    const mercadoOdds = obterProbabilidadesMercado();
    const h2hJogos = obterH2H();
    const h2h = calcularH2H(h2hJogos);
    let taxaEmpateH2H = h2h.empate;

    const totalJogosH2H = h2hJogos.length || 1;
    let somaGolsA = 0, somaGolsB = 0;

    h2hJogos.forEach(j => {
        somaGolsA += j.golsA;
        somaGolsB += j.golsB;
    });

    const timeA_H2H = {
        mediaMarcados: somaGolsA / totalJogosH2H,
        mediaSofridos: somaGolsB / totalJogosH2H
    };
    const timeB_H2H = {
        mediaMarcados: somaGolsB / totalJogosH2H,
        mediaSofridos: somaGolsA / totalJogosH2H
    };

    let probVitA = Math.round(h2h.vitoriaA);
    let probVitB = Math.round(h2h.vitoriaB);
    let bttsH2H = Math.round(h2h.btts);
    let over25H2H = Math.round(h2h.over25);

    if (mercadoOdds) {
        probVitA = Math.round((mercadoOdds.probMercadoA * 0.70) + (probVitA * 0.30));
        probVitB = Math.round((mercadoOdds.probMercadoB * 0.70) + (probVitB * 0.30));

        if (mercadoOdds.oddBTTS > 0) {
            const probBTTS_Casa = (1 / mercadoOdds.oddBTTS) * 100;
            bttsH2H = Math.round((probBTTS_Casa * 0.70) + (bttsH2H * 0.30));
        }
        if (mercadoOdds.oddOver25 > 0) {
            const probOver_Casa = (1 / mercadoOdds.oddOver25) * 100;
            over25H2H = Math.round((probOver_Casa * 0.70) + (over25H2H * 0.30));
        }
    }

    // 3. Aplicação dos Ajustes de Competição
    const ajustes = aplicarAjusteCompeticao(bttsH2H, over25H2H, taxaEmpateH2H, probVitA, tipoCompeticao);

    bttsH2H = ajustes.btts;
    over25H2H = ajustes.over25;

    // Se houve impulso na Vitória Casa no mata-mata, ajusta levemente a Vitória Fora para manter o equilíbrio
    if (tipoCompeticao === "matamata" && probVitA > 0) {
        const fatorImpulso = ajustes.vitoriaCasa / probVitA;
        probVitB = Math.max(5, Math.round(probVitB / fatorImpulso));
    }
    probVitA = ajustes.vitoriaCasa;
    taxaEmpateH2H = ajustes.empate;

    const oddA = mercadoOdds ? mercadoOdds.oddA : 0;
    const oddB = mercadoOdds ? mercadoOdds.oddB : 0;
    const oddOver25 = mercadoOdds ? mercadoOdds.oddOver25 : 0;
    const oddBTTS = mercadoOdds ? mercadoOdds.oddBTTS : 0;

    let melhorH2H = null;
    const mercadosGols = [];

    if ((oddBTTS === 0 || oddBTTS <= 1.85) && bttsH2H >= 65) {
        mercadosGols.push({ nome: "Ambos Marcam", probabilidade: bttsH2H });
    }
    if ((oddOver25 === 0 || oddOver25 <= 1.85) && over25H2H >= 65 && over25H2H >= (bttsH2H + 5)) {
        mercadosGols.push({ nome: "Over 2.5 Gols", probabilidade: over25H2H });
    }

    if (mercadosGols.length > 0) {
        mercadosGols.sort((a, b) => b.probabilidade - a.probabilidade);
        melhorH2H = mercadosGols[0];
    } else {
        const timeFavorito = probVitA >= probVitB ? nomeTimeA : nomeTimeB;
        const probFavorito = probVitA >= probVitB ? probVitA : probVitB;
        const oddFavorito = probVitA >= probVitB ? oddA : oddB;

        const eFavoritoClaro = (oddFavorito > 0 && oddFavorito <= 1.60) || (oddFavorito === 0 && probFavorito >= 60);

        if (eFavoritoClaro) {
            melhorH2H = { nome: `Vitória ${timeFavorito}`, probabilidade: probFavorito };
        } else {
            const probDNB = Math.min(88, Math.round(probFavorito + (taxaEmpateH2H * 0.30)));
            melhorH2H = { nome: `Empate Anula - ${timeFavorito}`, probabilidade: probDNB };
        }
    }

    // Define o favorito do pré-jogo exigindo pelo menos 5% de vantagem
    let favoritoPre = "NENHUM";
    if (probVitA - probVitB >= 5) {
        favoritoPre = "A";
    } else if (probVitB - probVitA >= 5) {
        favoritoPre = "B";
    }

    // ARMAZENA O ESTADO DO PRÉ-JOGO (Variável Global)
    dadosPreJogoCalculados = {
        nomeTimeA,
        nomeTimeB,
        probVitA,
        probVitB,
        bttsH2H,
        over25H2H,
        favoritoPre, // Usa a variável calculada acima com a margem de 5%
        sugestaoPre: melhorH2H.nome
    };

    const motivos = gerarMotivos(melhorH2H.nome, timeA_H2H, timeB_H2H, h2h, nomeTimeA, nomeTimeB, mercadoOdds);
    exibirResultadoPre(melhorH2H, motivos, probVitA, probVitB, bttsH2H, over25H2H);
}

// --- GATILHO PARA DISPARAR A ANÁLISE AO VIVO ---
function dispararAnaliseLive() {
    const tempoJogo = parseInt(document.getElementById("tempoJogo")?.value, 10) || 0;
    if (tempoJogo <= 0) {
        alert("Por favor, preencha os minutos do jogo para a análise Ao Vivo.");
        return;
    }
    analisarAoVivo(tempoJogo);
}

// --- 2. ETAPA AO VIVO (INTEGRA DADOS DO PRÉ-JOGO) ---
function analisarAoVivo(minutos) {
    const nomeTimeA = document.getElementById("timeA")?.value.trim() || "Time A";
    const nomeTimeB = document.getElementById("timeB")?.value.trim() || "Time B";

    const placarA = parseInt(document.getElementById("placarA")?.value, 10) || 0;
    const placarB = parseInt(document.getElementById("placarB")?.value, 10) || 0;
    const totalGols = placarA + placarB;

    const cantosA = parseInt(document.getElementById("escanteiosA")?.value, 10) || 0;
    const cantosB = parseInt(document.getElementById("escanteiosB")?.value, 10) || 0;
    const totalCantos = cantosA + cantosB;

    const chutesA = parseInt(document.getElementById("chutesA")?.value, 10) || 0;
    const chutesB = parseInt(document.getElementById("chutesB")?.value, 10) || 0;
    const totalChutes = chutesA + chutesB;

    const pressao = document.getElementById("pressaoTime")?.value || "nenhum";
    const sugestoesLive = [];

    const pre = dadosPreJogoCalculados || {
        probVitA: 50, probVitB: 50, bttsH2H: 50, over25H2H: 50, favoritoPre: "NENHUM"
    };

    // 1. ANÁLISE DE ESCANTEIOS
    const ritmoCantos = totalCantos / (minutos || 1);
    if ((minutos >= 30 && minutos <= 40) || (minutos >= 75 && minutos <= 85)) {
        if (ritmoCantos >= 0.12 || pressao !== "nenhum") {
            const timePressionando = pressao === "A" ? nomeTimeA : (pressao === "B" ? nomeTimeB : "Jogo Aberto");
            const sufixoTempo = minutos <= 45 ? "HT (1º Tempo)" : "FT (Final)";
            let confiancaCantos = (pre.over25H2H >= 60 || pre.bttsH2H >= 60) ? 90 : 82;

            sugestoesLive.push({
                mercado: "Escanteios Limite",
                entrada: `Over ${totalCantos + 0.5} Cantos Asian ${sufixoTempo}`,
                confianca: confiancaCantos,
                motivo: `Pressão ao vivo de ${timePressionando} (${totalCantos} cantos). Perfil pré-jogo favorável a ritmo intenso (${pre.over25H2H}% Over 2.5).`
            });
        }
    }

    // 2. ANÁLISE DE GOLS
    const chutesPressionador = pressao === "A" ? chutesA : (pressao === "B" ? chutesB : Math.max(chutesA, chutesB));

    if (minutos <= 38 && totalGols === 0 && totalChutes >= 4 && chutesPressionador >= 3) {
        let confiancaGols = pre.over25H2H >= 60 ? 88 : 78;
        sugestoesLive.push({
            mercado: "Gols",
            entrada: "Over 0.5 Gols no 1º Tempo (HT)",
            confianca: confiancaGols,
            motivo: `Jogo com ${totalChutes} chutes e placar 0x0 aos ${minutos}'. Matriz pré-jogo apoia gols.`
        });
    } else if (minutos >= 50 && minutos <= 70 && totalGols <= 1 && totalChutes >= 7) {
        sugestoesLive.push({
            mercado: "Gols",
            entrada: `Over ${totalGols + 0.5} Gols Partida`,
            confianca: 76,
            motivo: `Volume ofensivo elevado no 2º tempo com ${totalChutes} finalizações totais.`
        });
    }

    // 3. ANÁLISE DE RESULTADO
    if (pressao !== "nenhum" && (pressao === "A" ? placarA <= placarB : placarB <= placarA)) {
        const timeEmPressao = pressao === "A" ? nomeTimeA : nomeTimeB;
        const eFavoritoDoPre = pre.favoritoPre === pressao;

        let entradaResultado = "";
        let confiancaRes = 0;

        if (eFavoritoDoPre) {
            entradaResultado = `Vitória ${timeEmPressao}`;
            confiancaRes = 85;
        } else {
            entradaResultado = `Empate Anula (DNB) - ${timeEmPressao}`;
            confiancaRes = 75;
        }

        sugestoesLive.push({
            mercado: "Resultado Final",
            entrada: entradaResultado,
            confianca: confiancaRes,
            motivo: `${timeEmPressao} domina as ações ao vivo. ${eFavoritoDoPre ? "Confirma o favoritismo traçado no Pré-Jogo." : "Como não era favorito pré-jogo, protegemos no DNB."}`
        });
    }

    if (sugestoesLive.length === 0) {
        sugestoesLive.push({
            mercado: "Aguardar",
            entrada: "Sem entrada com EV+ no momento",
            confianca: 50,
            motivo: `Sem indicadores de pressão ou volume suficiente no minuto ${minutos}'.`
        });
    }

    sugestoesLive.sort((a, b) => b.confianca - a.confianca);
    exibirResultadoLive(sugestoesLive[0], sugestoesLive, minutos, placarA, placarB, totalCantos, totalChutes, pressao, nomeTimeA, nomeTimeB);
}

// --- RENDERIZADORES DE TELA ---
function exibirResultadoPre(melhorH2H, motivos, probVitA, probVitB, bttsH2H, over25H2H) {
    const painelResultado = document.getElementById("painelResultado");
    const resultadoConteudo = document.getElementById("resultadoConteudo");

    if (painelResultado) painelResultado.hidden = false;

    resultadoConteudo.innerHTML = `
        <div class="resultado-top" style="margin-bottom: 15px;">
            <strong style="font-size: 1.2rem;">⚔️ Sugestão Pré-Jogo: ${melhorH2H.nome}</strong>
            <span class="probabilidade" style="background-color: #10b981; color: #022c22; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-left: 10px;">${melhorH2H.probabilidade}%</span>
        </div>
        <div class="motivos-box" style="background-color: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="font-size: 1rem; margin-bottom: 8px;">Matriz Probabilística Guardada</h3>
            <ul style="padding-left: 20px; font-size: 0.9rem;">
                ${motivos.map(m => `<li>${m}</li>`).join("")}
            </ul>
        </div>
        <div class="cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
            <div class="card" style="background-color: rgba(0,0,0,0.2); padding: 8px; text-align: center;">
                <span style="display: block; font-size: 0.75rem;">Vitória Mandante</span>
                <strong>${probVitA}%</strong>
            </div>
            <div class="card" style="background-color: rgba(0,0,0,0.2); padding: 8px; text-align: center;">
                <span style="display: block; font-size: 0.75rem;">Vitória Visitante</span>
                <strong>${probVitB}%</strong>
            </div>
            <div class="card" style="background-color: rgba(0,0,0,0.2); padding: 8px; text-align: center;">
                <span style="display: block; font-size: 0.75rem;">BTTS</span>
                <strong>${bttsH2H}%</strong>
            </div>
            <div class="card" style="background-color: rgba(0,0,0,0.2); padding: 8px; text-align: center;">
                <span style="display: block; font-size: 0.75rem;">Over 2.5</span>
                <strong>${over25H2H}%</strong>
            </div>
        </div>
    `;
}

function exibirResultadoLive(principal, sugestoesLive, minutos, placarA, placarB, totalCantos, totalChutes, pressao, nomeTimeA, nomeTimeB) {
    const painelResultado = document.getElementById("painelResultado");
    const resultadoConteudo = document.getElementById("resultadoConteudo");

    if (painelResultado) painelResultado.hidden = false;

    resultadoConteudo.innerHTML = `
        <div class="resultado-top" style="margin-bottom: 15px;">
            <strong style="font-size: 1.2rem;">⚡ Entrada Ao Vivo (${minutos}'): ${principal.entrada}</strong>
            <span class="probabilidade" style="background-color: #f59e0b; color: #000; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-left: 10px;">${principal.confianca}%</span>
        </div>
        <div class="motivos-box" style="background-color: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="font-size: 1rem; margin-bottom: 8px;">Cruzamento: Pré-Jogo + Ao Vivo</h3>
            <ul style="padding-left: 20px; font-size: 0.9rem;">
                ${sugestoesLive.map(s => `<li><strong>[${s.mercado}]</strong> ${s.entrada} — <em>${s.motivo}</em></li>`).join("")}
            </ul>
        </div>
        <div class="cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
            <div class="card" style="background-color: rgba(0,0,0,0.2); padding: 8px; text-align: center;">
                <span style="display: block; font-size: 0.75rem;">Placar</span>
                <strong>${placarA} - ${placarB}</strong>
            </div>
            <div class="card" style="background-color: rgba(0,0,0,0.2); padding: 8px; text-align: center;">
                <span style="display: block; font-size: 0.75rem;">Cantos</span>
                <strong>${totalCantos}</strong>
            </div>
            <div class="card" style="background-color: rgba(0,0,0,0.2); padding: 8px; text-align: center;">
                <span style="display: block; font-size: 0.75rem;">Chutes No Gol</span>
                <strong>${totalChutes}</strong>
            </div>
            <div class="card" style="background-color: rgba(0,0,0,0.2); padding: 8px; text-align: center;">
                <span style="display: block; font-size: 0.75rem;">Pressão Dominante</span>
                <strong>${pressao === "A" ? nomeTimeA : (pressao === "B" ? nomeTimeB : "Nenhuma")}</strong>
            </div>
        </div>
    `;
}

// --- FUNÇÕES AUXILIARES ---
function obterProbabilidadesMercado() {
    const oddA = parseFloat(document.getElementById("oddA")?.value) || 0;
    const oddEmpate = parseFloat(document.getElementById("oddEmpate")?.value) || 0;
    const oddB = parseFloat(document.getElementById("oddB")?.value) || 0;
    const oddOver25 = parseFloat(document.getElementById("oddOver25")?.value) || 0;
    const oddBTTS = parseFloat(document.getElementById("oddBTTS")?.value) || 0;

    if (oddA <= 0 || oddB <= 0) return null;

    const probA_crua = 1 / oddA;
    const probB_crua = 1 / oddB;
    const probEmpate_crua = oddEmpate > 0 ? (1 / oddEmpate) : 0;
    const somaProbs = probA_crua + probB_crua + probEmpate_crua;

    return {
        probMercadoA: (probA_crua / somaProbs) * 100,
        probMercadoB: (probB_crua / somaProbs) * 100,
        oddA, oddB, oddOver25, oddBTTS
    };
}

function obterH2H() {
    const confrontos = [];
    for (let i = 1; i <= 5; i++) {
        const valA = document.getElementById(`h_a${i}`)?.value;
        const valB = document.getElementById(`h_b${i}`)?.value;

        if (valA !== "" && valB !== "" && valA !== undefined && valB !== undefined) {
            confrontos.push({
                golsA: parseInt(valA, 10) || 0,
                golsB: parseInt(valB, 10) || 0
            });
        }
    }
    return confrontos;
}

function calcularH2H(jogos) {
    if (!jogos || jogos.length === 0) {
        return { vitoriaA: 33, vitoriaB: 33, empate: 34, btts: 50, over25: 50 };
    }

    let vitA = 0, vitB = 0, emp = 0, bttsCount = 0, over25Count = 0;
    const total = jogos.length;

    jogos.forEach(j => {
        if (j.golsA > j.golsB) vitA++;
        else if (j.golsB > j.golsA) vitB++;
        else emp++;

        if (j.golsA > 0 && j.golsB > 0) bttsCount++;
        if ((j.golsA + j.golsB) > 2) over25Count++;
    });

    return {
        vitoriaA: (vitA / total) * 100,
        vitoriaB: (vitB / total) * 100,
        empate: (emp / total) * 100,
        btts: (bttsCount / total) * 100,
        over25: (over25Count / total) * 100
    };
}

function gerarMotivos(nomeSugestao, timeA, timeB, h2h, nomeA, nomeB, mercadoOdds) {
    const motivos = [];
    if (nomeSugestao === "Ambos Marcam") {
        motivos.push(`Alta incidência de gols em ambos os lados nos últimos confrontos (${h2h.btts}% H2H BTTS).`);
    } else if (nomeSugestao === "Over 2.5 Gols") {
        motivos.push(`Frequência elevada de jogos com 3 ou mais gols (${h2h.over25}% Over 2.5).`);
    } else if (nomeSugestao.includes("Vitória")) {
        motivos.push(`${nomeSugestao.replace("Vitória ", "")} demonstra dominância no retrospecto ou mercado.`);
    } else if (nomeSugestao.includes("Empate Anula")) {
        motivos.push(`Tendência de equilíbrio (${h2h.empate}% empates H2H), reduzindo o risco no DNB.`);
    }
    return motivos;
}

function preencherAutomatico() {
    document.getElementById("tipoCompeticao").value = "liga";
    document.getElementById("timeA").value = "Flamengo";
    document.getElementById("timeB").value = "Palmeiras";
    document.getElementById("oddA").value = "2.10";
    document.getElementById("oddEmpate").value = "3.20";
    document.getElementById("oddB").value = "3.40";
    document.getElementById("oddOver25").value = "1.85";
    document.getElementById("oddBTTS").value = "1.75";

    const h2hExemplo = [{ a: 2, b: 1 }, { a: 1, b: 1 }, { a: 3, b: 0 }, { a: 0, b: 2 }, { a: 2, b: 2 }];
    h2hExemplo.forEach((j, i) => {
        document.getElementById(`h_a${i + 1}`).value = j.a;
        document.getElementById(`h_b${i + 1}`).value = j.b;
    });

    document.getElementById("tempoJogo").value = "35";
    document.getElementById("placarA").value = "0";
    document.getElementById("placarB").value = "0";
    document.getElementById("escanteiosA").value = "5";
    document.getElementById("escanteiosB").value = "1";
    document.getElementById("chutesA").value = "4";
    document.getElementById("chutesB").value = "1";
    document.getElementById("pressaoTime").value = "A";
}

function limparFormulario() {
    dadosPreJogoCalculados = null;
    const inputs = document.querySelectorAll("input[type='text'], input[type='number']");
    inputs.forEach(input => input.value = "");

    const select = document.getElementById("tipoCompeticao");
    if (select) select.selectedIndex = 0;

    const pressao = document.getElementById("pressaoTime");
    if (pressao) pressao.selectedIndex = 0;

    const painelResultado = document.getElementById("painelResultado");
    const resultadoConteudo = document.getElementById("resultadoConteudo");
    if (painelResultado) painelResultado.hidden = true;
    if (resultadoConteudo) resultadoConteudo.innerHTML = "";
}