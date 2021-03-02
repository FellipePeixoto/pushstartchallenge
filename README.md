# Boxmatch

Todo fluxo de jogo se encontra no arquivo [index.js](https://github.com/FellipePeixoto/pushstartchallenge/blob/master/js/index.js). Bibliotecas adicionais como [PixiJS](https://www.pixijs.com) e [GSAP](https://greensock.com) foram baixados e incluídos no projeto e se encontram em pastas com seus respectivos nomes.

## Variáveis de configuração
É possível personalizar as seguintes caractéristicas do game:

```js
/*Tamanho em pixels do bloco na tela, inclusize os modificadores 
(o tamanho padrão é aplicado na altura e largura).*/
AppBlockSize = 35;

/*Cor da borda do bloco final em hexadecimal,
por padrão é um tom de cinza.*/
FinalBlockBorderColor = 0xA8A8A8;

/*Onde o bloco inicial deve ser posicionado horizontalmente na tela. 
O valor vai de 0 a 1 e é diretamente proporcional a largura da tela 
onde está sendo exibido.*/
LevelStartOffset = 0.1;

/*Onde o bloco final deve ser posicionado horizontalmente na tela. 
O valor vai de 0 a 1 e é diretamente proporcional 
a largura da tela onde está sendo exibido.*/
LevelEndOffset = 0.9;

/*O tempo em segundos que o bloco inicial 
leva para chegar ao modificador mais próximo.*/
MoveIntervalBetweenModifiers = 1.35;

/*O tempo em segundos que o bloco inicial leva 
para ser modificado ao alcançar um modificador.*/
ModifierTransitionInterval = 0.35;
```

## Carregamento de levels
Todo carregamento de levels é dinâmico e feito através da seguinte estrutura JSON: 
```json
[
    {
        "name": "level name",
        "initial": {
            "size": 2,
            "color": "#00ff00"
        },
        "final": {
            "size": 1,
            "color": "#ff00ff"
        },
        "modifiers": [
            {
                "type": "resize",
                "size": 1
            },
            {
                "type": "resize",
                "size": 2
            },
            {
                "type": "select",
                "options": [
                    {
                        "type": "colorize",
                        "color": "#ff00ff"
                    },
                    {
                        "type": "resize",
                        "size": 2
                    }
                ]
            },
            {
                "type": "resize",
                "size": 1
            }
        ]
    }
]
```

A função ```buildLevel(levelIndex)``` interpreta todos os dados do JSON e retorna um objeto no seguinte formato:
``` js
{
    name: "", // o nome do level
    startTime: 0, // o exato momento em que o level foi carregado
    endTime: 0, // o exato momento em que o jogador clicou no bloco e o mesmo pode se mover
    index: -1, // o index do level em relação aos outros
    container: null, // PIXI Container com os objetos do level
    blockIsMoving: false, // o bloco inicial está se movendo?
    startBlock: { size: 0, color: 0x000000 }, // configurações atuais do bloco inicial
    finalBlock: { size: 0, color: 0x000000 }, // configurações do bloco final
    modifiers: [{
        nameId: "",
        type: "",
        container: null
    }], // todos os modificadores do level, assim comos seus containers (view) e caractéristicas
    // Para modificadores de cor o campo colorize está disponível
    // Para modificadores de tamanho o campo resize está disponível
    // Para o seletor de modficadores um array de options está disponível
};
```










