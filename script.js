
var lancamentos = [];
var metaEconomia = 0;
var usuarioAtual = null;
var configurado = window.SUPABASE_URL && window.SUPABASE_ANON_KEY &&
    !window.SUPABASE_URL.includes("COLE_A_") && !window.SUPABASE_ANON_KEY.includes("COLE_A_");
var supabase = configurado
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

var grafico = null;

var form = document.getElementById("formLancamento");
var campoMes = document.getElementById("mesSelecionado");
var campoData = document.getElementById("data");
var campoTipoGrafico = document.getElementById("tipoGrafico");

function formatarDinheiro(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function obterMesAtual() {
    var agora = new Date();
    var mes = String(agora.getMonth() + 1).padStart(2, "0");

    return agora.getFullYear() + "-" + mes;
}

function obterDataAtual() {
    var agora = new Date();
    var mes = String(agora.getMonth() + 1).padStart(2, "0");
    var dia = String(agora.getDate()).padStart(2, "0");

    return agora.getFullYear() + "-" + mes + "-" + dia;
}

async function carregarDadosUsuario() {
    var resultadoLancamentos = await supabase.from("lancamentos")
        .select("id, descricao, valor, tipo, categoria, data")
        .order("data", { ascending: true });
    if (resultadoLancamentos.error) throw resultadoLancamentos.error;
    lancamentos = resultadoLancamentos.data.map(function(item) {
        return Object.assign({}, item, { valor: Number(item.valor) });
    });

    var resultadoPreferencias = await supabase.from("preferencias_usuario")
        .select("meta_economia").eq("user_id", usuarioAtual.id).maybeSingle();
    if (resultadoPreferencias.error) throw resultadoPreferencias.error;
    metaEconomia = Number(resultadoPreferencias.data?.meta_economia || 0);
    document.getElementById("valorMeta").value = metaEconomia || "";
    atualizarTela();
}

async function sincronizarSessao(sessao) {
    usuarioAtual = sessao ? sessao.user : null;
    var painelAcesso = document.getElementById("painelAcesso");
    var conteudoApp = document.getElementById("conteudoApp");
    var contaTopo = document.getElementById("contaTopo");
    painelAcesso.hidden = Boolean(usuarioAtual);
    conteudoApp.hidden = !usuarioAtual;
    contaTopo.hidden = !usuarioAtual;
    if (usuarioAtual) {
        document.getElementById("emailUsuario").textContent = usuarioAtual.email;
        try {
            await carregarDadosUsuario();
        } catch (erro) {
            mostrarMensagemAcesso("Não foi possível carregar seus dados. Confira se executou o SQL de configuração.");
            console.error(erro);
        }
    } else {
        lancamentos = [];
        metaEconomia = 0;
        if (grafico) { grafico.destroy(); grafico = null; }
    }
}

function mostrarMensagemAcesso(mensagem) {
    document.getElementById("mensagemAcesso").textContent = mensagem;
}

function obterLancamentosDoMes() {
    var mes = campoMes.value;

    return lancamentos.filter(function(lancamento) {
        return lancamento.data.substring(0, 7) === mes;
    });
}

function calcularTotais(lista) {
    var receitas = 0;
    var despesas = 0;

    for (var i = 0; i < lista.length; i++) {
        if (lista[i].tipo === "receita") {
            receitas += lista[i].valor;
        } else {
            despesas += lista[i].valor;
        }
    }

    return {
        receitas: receitas,
        despesas: despesas,
        saldo: receitas - despesas
    };
}

function atualizarResumo(totais) {
    document.getElementById("totalReceitas").textContent =
        formatarDinheiro(totais.receitas);

    document.getElementById("totalDespesas").textContent =
        formatarDinheiro(totais.despesas);

    document.getElementById("saldoMes").textContent =
        formatarDinheiro(totais.saldo);

    var percentual = 0;

    if (totais.receitas > 0) {
        percentual = (totais.despesas / totais.receitas) * 100;
    }

    document.getElementById("percentualGasto").textContent =
        Math.round(percentual) + "%";

    atualizarAlerta(totais, percentual);
}

function atualizarAlerta(totais, percentual) {
    var alerta = document.getElementById("alerta");
    var mensagem = document.getElementById("mensagemAlerta");

    alerta.className = "alerta";

    if (totais.receitas === 0 && totais.despesas === 0) {
        mensagem.textContent =
            "Cadastre suas receitas e despesas para começar.";

    } else if (totais.receitas === 0) {
        alerta.classList.add("atencao");

        mensagem.textContent =
            "Você ainda não cadastrou receitas neste mês. " +
            "Registre sua renda para avaliar seu orçamento.";

    } else if (totais.saldo < 0) {
        alerta.classList.add("perigo");

        mensagem.textContent =
            "Atenção! Suas despesas ultrapassaram suas receitas em " +
            formatarDinheiro(Math.abs(totais.saldo)) + ".";

    } else if (percentual >= 80) {
        alerta.classList.add("atencao");

        mensagem.textContent =
            "Atenção! Você já utilizou " +
            Math.round(percentual) +
            "% da sua renda. Seu saldo atual é de " +
            formatarDinheiro(totais.saldo) + ".";

    } else {
        mensagem.textContent =
            "Você está no azul! Suas despesas representam " +
            Math.round(percentual) +
            "% das receitas registradas. Saldo atual: " +
            formatarDinheiro(totais.saldo) + ".";
    }
}

function mostrarLancamentos(lista) {
    var tabela = document.getElementById("listaLancamentos");

    tabela.replaceChildren();

    if (lista.length === 0) {
        var linhaVazia = document.createElement("tr");
        var celulaVazia = document.createElement("td");

        celulaVazia.colSpan = 6;
        celulaVazia.textContent =
            "Nenhum lançamento neste mês.";

        linhaVazia.appendChild(celulaVazia);
        tabela.appendChild(linhaVazia);

        return;
    }

    for (var i = lista.length - 1; i >= 0; i--) {
        var item = lista[i];
        var linha = document.createElement("tr");

        var descricao = document.createElement("td");
        descricao.textContent = item.descricao;

        var categoria = document.createElement("td");
        categoria.textContent = item.categoria;

        var data = document.createElement("td");
        var partesData = item.data.split("-");
        data.textContent =
            partesData[2] + "/" + partesData[1] + "/" + partesData[0];

        var tipo = document.createElement("td");
        tipo.textContent =
            item.tipo === "receita" ? "Receita" : "Despesa";
        tipo.className = item.tipo;

        var valor = document.createElement("td");
        valor.textContent = formatarDinheiro(item.valor);
        valor.className = item.tipo;

        var acao = document.createElement("td");
        var botao = document.createElement("button");

        botao.type = "button";
        botao.textContent = "Excluir";
        botao.className = "botao-excluir";

        botao.addEventListener("click", function(id) {
            return function() {
                excluirLancamento(id);
            };
        }(item.id));

        acao.appendChild(botao);

        linha.appendChild(descricao);
        linha.appendChild(categoria);
        linha.appendChild(data);
        linha.appendChild(tipo);
        linha.appendChild(valor);
        linha.appendChild(acao);

        tabela.appendChild(linha);
    }
}

function atualizarGrafico(lista) {
    var categorias = {};

    for (var i = 0; i < lista.length; i++) {
        if (lista[i].tipo === "despesa") {
            var nome = lista[i].categoria;

            if (!categorias[nome]) {
                categorias[nome] = 0;
            }

            categorias[nome] += lista[i].valor;
        }
    }

    var nomes = Object.keys(categorias);
    var valores = Object.values(categorias);

    if (grafico) {
        grafico.destroy();
    }

    grafico = new Chart(
        document.getElementById("graficoCategorias"),
        {
            type: campoTipoGrafico.value,

            data: {
                labels: nomes.length ? nomes : ["Sem despesas"],
                datasets: [{
                    data: valores.length ? valores : [1],
                    backgroundColor: [
                        "#d946ef",
                        "#00e5ff",
                        "#c4ff3b",
                        "#ff7a18",
                        "#ff3864",
                        "#00f5a0",
                        "#9b5cff",
                        "#fff04a"
                    ],
                    borderColor: "#15141e",
                    borderWidth: 3,
                    hoverOffset: campoTipoGrafico.value === "bar" ? 0 : 10,
                    borderRadius: campoTipoGrafico.value === "bar" ? 6 : 0
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: "#d8d3e7",
                            padding: 18
                        }
                    }
                },
                scales: campoTipoGrafico.value === "bar" ? {
                    x: {
                        ticks: { color: "#d8d3e7" },
                        grid: { color: "rgba(216, 211, 231, 0.08)" }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: "#d8d3e7" },
                        grid: { color: "rgba(216, 211, 231, 0.12)" }
                    }
                } : {}
            }
        }
    );
}

function atualizarMeta(totais) {
    var texto = document.getElementById("textoMeta");
    var progresso = document.getElementById("progressoMeta");

    if (metaEconomia <= 0) {
        texto.textContent =
            "Defina uma meta para acompanhar seu progresso.";

        progresso.value = 0;
        return;
    }

    var valorGuardado = Math.max(0, totais.saldo);
    var porcentagem = (valorGuardado / metaEconomia) * 100;

    progresso.value = Math.min(porcentagem, 100);

    texto.textContent =
        "Meta: " + formatarDinheiro(metaEconomia) +
        " | Saldo positivo do mês: " + formatarDinheiro(valorGuardado) +
        " | Progresso: " + Math.round(porcentagem) + "%";
}

function atualizarTela() {
    var lista = obterLancamentosDoMes();
    var totais = calcularTotais(lista);

    atualizarResumo(totais);
    mostrarLancamentos(lista);
    atualizarGrafico(lista);
    atualizarMeta(totais);
}

form.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    var descricao = document.getElementById("descricao").value.trim();
    var valor = Number(document.getElementById("valor").value);
    var tipo = document.getElementById("tipo").value;
    var categoria = document.getElementById("categoria").value;
    var data = campoData.value;

    if (!descricao || !Number.isFinite(valor) || valor <= 0 || !data) {
        alert("Preencha os campos corretamente.");
        return;
    }

    var resultado = await supabase.from("lancamentos").insert({
        user_id: usuarioAtual.id,
        descricao: descricao,
        valor: valor,
        tipo: tipo,
        categoria: categoria,
        data: data
    }).select("id, descricao, valor, tipo, categoria, data").single();
    if (resultado.error) { alert("Não foi possível salvar o lançamento: " + resultado.error.message); return; }
    lancamentos.push(Object.assign({}, resultado.data, { valor: Number(resultado.data.valor) }));
    form.reset();

    campoData.value = obterDataAtual();
    atualizarTela();
});

async function excluirLancamento(id) {
    var confirmar = confirm("Deseja excluir este lançamento?");

    if (!confirmar) {
        return;
    }

    var resultado = await supabase.from("lancamentos").delete().eq("id", id).eq("user_id", usuarioAtual.id);
    if (resultado.error) { alert("Não foi possível excluir o lançamento."); return; }
    lancamentos = lancamentos.filter(function(item) { return item.id !== id; });
    atualizarTela();
}

document.getElementById("salvarMeta").addEventListener("click", async function() {
    var valor = Number(document.getElementById("valorMeta").value);

    if (!Number.isFinite(valor) || valor <= 0) {
        alert("Digite um valor de meta válido.");
        return;
    }

    var resultado = await supabase.from("preferencias_usuario").upsert({ user_id: usuarioAtual.id, meta_economia: valor }, { onConflict: "user_id" });
    if (resultado.error) { alert("Não foi possível salvar a meta: " + resultado.error.message); return; }
    metaEconomia = valor;
    atualizarTela();
});

campoMes.addEventListener("change", atualizarTela);
campoTipoGrafico.addEventListener("change", atualizarTela);

campoMes.value = obterMesAtual();
campoData.value = obterDataAtual();
document.getElementById("valorMeta").value = metaEconomia || "";

var modoCadastro = false;
document.getElementById("alternarAcesso").addEventListener("click", function() {
    modoCadastro = !modoCadastro;
    document.getElementById("tituloAcesso").textContent = modoCadastro ? "Criar sua conta" : "Entre na sua conta";
    document.getElementById("botaoAcesso").textContent = modoCadastro ? "Criar conta" : "Entrar";
    document.getElementById("alternarAcesso").textContent = modoCadastro ? "Já tenho uma conta" : "Criar uma conta";
    document.getElementById("senhaAcesso").autocomplete = modoCadastro ? "new-password" : "current-password";
    mostrarMensagemAcesso("");
});

document.getElementById("formAcesso").addEventListener("submit", async function(evento) {
    evento.preventDefault();
    if (!configurado) { mostrarMensagemAcesso("Configure a URL e a chave do Supabase em supabase-config.js e execute supabase-schema.sql no painel do projeto."); return; }
    var email = document.getElementById("emailAcesso").value.trim();
    var senha = document.getElementById("senhaAcesso").value;
    var botao = document.getElementById("botaoAcesso");
    botao.disabled = true;
    mostrarMensagemAcesso(modoCadastro ? "Criando sua conta..." : "Entrando...");
    var resposta;
    if (modoCadastro) {
        var dadosCadastro = { email: email, password: senha };
        if (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1") {
            dadosCadastro.options = {
                emailRedirectTo: location.origin + location.pathname
            };
        }
        resposta = await supabase.auth.signUp(dadosCadastro);
    } else {
        resposta = await supabase.auth.signInWithPassword({ email: email, password: senha });
    }
    botao.disabled = false;
    if (resposta.error) { mostrarMensagemAcesso(resposta.error.message); return; }
    if (modoCadastro && !resposta.data.session) {
        mostrarMensagemAcesso("Conta criada. Confirme seu e-mail pelo link enviado para entrar.");
    } else {
        mostrarMensagemAcesso("");
        await sincronizarSessao(resposta.data.session);
    }
});

document.getElementById("sairConta").addEventListener("click", async function() {
    await supabase.auth.signOut();
});

if (!configurado) {
    mostrarMensagemAcesso("Para ativar o login, configure supabase-config.js e execute supabase-schema.sql no Supabase.");
} else {
    supabase.auth.onAuthStateChange(function(_evento, sessao) {
        sincronizarSessao(sessao);
    });
    supabase.auth.getSession().then(function(resposta) { return sincronizarSessao(resposta.data.session); });
}

var estadoConexao = document.getElementById("estadoConexao");
var botaoInstalar = document.getElementById("instalarApp");
var promptInstalacao = null;

function atualizarEstadoConexao() {
    estadoConexao.hidden = navigator.onLine;
    estadoConexao.textContent = navigator.onLine
        ? ""
        : "Sem conexão. Para entrar, consultar e sincronizar seus dados, conecte-se à internet.";
}

window.addEventListener("online", atualizarEstadoConexao);
window.addEventListener("offline", atualizarEstadoConexao);
atualizarEstadoConexao();

window.addEventListener("beforeinstallprompt", function(evento) {
    evento.preventDefault();
    promptInstalacao = evento;
    botaoInstalar.textContent = "Instalar Finance+";
});

botaoInstalar.addEventListener("click", async function() {
    if (promptInstalacao) {
        promptInstalacao.prompt();
        await promptInstalacao.userChoice;
        promptInstalacao = null;
        return;
    }

    if (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone) {
        botaoInstalar.hidden = true;
        return;
    }

    var mensagem;
    if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
        mensagem = "Para instalar, publique o site em um endereço HTTPS primeiro.";
    } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        mensagem = "No Safari, toque em Compartilhar e escolha Adicionar à Tela de Início.";
    } else {
        mensagem = "No menu do navegador, escolha Instalar app ou Adicionar à tela inicial.";
    }
    alert(mensagem);
});

window.addEventListener("appinstalled", function() {
    botaoInstalar.hidden = true;
});

if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("./service-worker.js").catch(function(erro) {
        console.warn("Não foi possível ativar o modo PWA:", erro);
    });
}
