gsap.registerPlugin(PixiPlugin);

const AppBlockSize = 35;
const FinalBlockBorderColor = 0xA8A8A8;
const LevelStartOffset = 0.1;
const LevelEndOffset = 0.9;
const MoveIntervalBetweenModifiers = 1.35;
const ModifierTransitionInterval = 0.35;
const ModifierSelectorType = "select";
const ResizeModifierType = "resize";
const ColorizeModifierType = "colorize";
const StartBlockTag = "start block";
const FinalBlockTag = "final block";
const ModifierPreTag = "modifier_";
const buttonFontStyle = {
    fill: "#FFFFFF"
};
const buttonFontStyleMouseOver = {
    fill: "#a8a8a8"
};

var app = new PIXI.Application({ autoResize: true });
app.renderer.resize(window.innerWidth, 150 + 100 + 100);
document.getElementById("content").appendChild(app.view);

var appWidth = app.renderer.view.width;
var appCurrentLevel = {
    name: "",
    startTime: 0,
    endTime: 0,
    index: -1,
    container: null,
    blockIsMoving: false,
    startBlock: { size: 0, color: 0x000000 },
    finalBlock: { size: 0, color: 0x000000 },
    modifiers: [{
        nameId: "",
        type: "",
        container: null
    }],
};

var request = new XMLHttpRequest();
request.open("GET", "https://teste.pushstart.com.br/api/blocks/levels", false);
request.send(null);
var levels = JSON.parse(request.responseText);

var gameTimeline = gsap.timeline();
var endGameUI = buildEndGameMenu(app.renderer.width);
appCurrentLevel = buildLevel(0);
app.stage.addChild(appCurrentLevel.container, endGameUI);

function buildEndGameMenu(currentWidth) {
    let container = new PIXI.Container();

    let leftSide = new PIXI.Container();
    let leftSideBorder = new PIXI.Graphics();
    leftSideBorder.beginFill();
    leftSideBorder.drawRect(0, 0, currentWidth * 0.7, 150);
    leftSideBorder.endFill();

    let seekbarContainer = new PIXI.Container();
    seekbarContainer.position.set(50, 30);
    let seekBar = new PIXI.Graphics();
    seekBar.beginFill(0xFFFFFF);
    seekBar.drawRect(0, 0, 500, 20);
    seekBar.endFill();
    seekBar.interactive = true;
    seekBar.on("click", (event) => {
        seekReplay(event.data.getLocalPosition(seekBar).x / seekBar.width);
    });
    let seekCursor = new PIXI.Graphics();
    seekCursor.beginFill(0xFF0000);
    seekCursor.drawRect(0, 0, 20, 20);
    seekCursor.endFill();

    seekbarContainer.addChild(seekBar, seekCursor);
    leftSide.addChild(leftSideBorder, seekbarContainer);

    let rightSide = new PIXI.Container();
    let rightSideBorder = new PIXI.Graphics();
    rightSideBorder.beginFill();
    rightSideBorder.drawRect(0, 0, currentWidth * 0.3, 150);
    rightSideBorder.endFill();
    rightSide.addChild(rightSideBorder);
    rightSide.x = leftSide.width;


    let buttonReplay = new PIXI.Text("Replay", buttonFontStyle);
    buttonReplay.interactive = true;
    buttonReplay.on("click", (event) => {
        playReplay();
    });
    buttonReplay.on('mouseover', (event) => {
        buttonReplay.style = buttonFontStyleMouseOver;
    });
    buttonReplay.on('mouseout', (event) => {
        buttonReplay.style = buttonFontStyle;
    });

    let nextLevelButton = new PIXI.Text("Next Level", buttonFontStyle);
    nextLevelButton.interactive = true;
    nextLevelButton.on('click', (event) => {
        if (assertBlocks(appCurrentLevel.startBlock, appCurrentLevel.finalBlock)) {
            nextLevel();
        }
    });
    nextLevelButton.on('mouseover', (event) => {
        nextLevelButton.style = buttonFontStyleMouseOver;
    });
    nextLevelButton.on('mouseout', (event) => {
        nextLevelButton.style = buttonFontStyle;
    });
    nextLevelButton.y = 35;

    rightSide.addChild(buttonReplay, nextLevelButton);
    container.addChild(rightSide, leftSide);

    container.visible = false;
    container.y = 250;

    bindReplay((progress) => {
        seekCursor.x = seekBar.x + (seekBar.width - seekCursor.width) * progress;
    });
    return container;
}

function buildLevel(levelIndex) {
    if (levelIndex < 0 || levelIndex >= levels.length) {
        return;
    }

    let auxContainer = new PIXI.Container();
    auxContainer.y = 150;
    let containerVerticalCenter = auxContainer.x + auxContainer.height / 2;

    let initialBlockStartColor = stringHEXtoHEX(levels[levelIndex].initial.color);
    let initialBlockStartSize = levels[levelIndex].initial.size;
    let initialBlock = buildStartBlock(initialBlockStartColor, initialBlockStartSize);
    let initialBLockStartPositionX = (appWidth * LevelStartOffset);
    let initialBlockPositionY = containerVerticalCenter;
    initialBlock.interactive = true;
    initialBlock.on('click', (event) => {
        blockClick();
    });
    initialBlock.on('tap', (event) => {
        blockClick();
    });
    initialBlock.x = initialBLockStartPositionX;
    initialBlock.y = initialBlockPositionY;
    initialBlock.name = StartBlockTag;

    let finalBlockColor = stringHEXtoHEX(levels[levelIndex].final.color);
    let finalBlockSize = levels[levelIndex].final.size;
    let finalBlockPositionX = (appWidth * LevelEndOffset);
    let finalBlockPositionY = containerVerticalCenter;
    let finalBlock = buildFinalBlock(finalBlockColor, finalBlockSize);
    finalBlock.x = finalBlockPositionX;
    finalBlock.y = finalBlockPositionY;
    finalBlock.name = FinalBlockTag;

    let levelLine = new PIXI.Graphics();
    let lineStart = appWidth * LevelStartOffset;
    let lineEnd = (appWidth * LevelEndOffset) - lineStart;
    levelLine.lineStyle(2, 0xA8A8A8, 1);
    levelLine.lineTo(lineEnd, 0);
    levelLine.x = lineStart;
    levelLine.y = containerVerticalCenter;

    let levelModifiers = levels[levelIndex].modifiers;
    let modifierBlockYPosition = containerVerticalCenter;
    let modifierBlockPart = (finalBlockPositionX - initialBLockStartPositionX) / (levelModifiers.length + 1);
    var lastModifierXPosition = initialBLockStartPositionX;

    auxContainer.addChild(levelLine);
    auxContainer.addChild(finalBlock);
    let modifiersTemp = [];

    for (let i = 0; i < levelModifiers.length; i++) {
        let modifierBlockXPosition = lastModifierXPosition + modifierBlockPart;
        lastModifierXPosition = modifierBlockXPosition;

        let modifier = levels[levelIndex].modifiers[i];
        let modifierContainer;
        switch (levels[levelIndex].modifiers[i].type) {
            case ResizeModifierType:
                modifierContainer = buildResizeModifier(i, modifier.size);
                modifiersTemp.push({
                    nameId: modifierContainer.name,
                    type: ResizeModifierType,
                    size: modifier.size,
                    container: modifierContainer
                });
                break;

            case ColorizeModifierType:
                let color = stringHEXtoHEX(modifier.color);
                modifierContainer = buildColorizeModifier(i, color);
                modifiersTemp.push({
                    nameId: modifierContainer.name,
                    type: ColorizeModifierType,
                    color: color,
                    container: modifierContainer
                });
                break;
            case ModifierSelectorType:
                modifierContainer = setupModifierSelector(i, modifier.options);
                modifierContainer.interactive = true;
                modifierContainer.on("click", (event) => {
                    selectorClick(modifierContainer.name);
                });
                modifierContainer.on("tap", (event) => {
                    selectorClick(modifierContainer.name);
                });
                modifiersTemp.push({
                    nameId: modifierContainer.name,
                    type: ModifierSelectorType,
                    options: formatOptionsColorsToHEX(modifier.options),
                    container: modifierContainer,
                    currOptionIndex: -1
                });
                break;
        }
        modifierContainer.x = modifierBlockXPosition;
        modifierContainer.y = modifierBlockYPosition;
        auxContainer.addChild(modifierContainer);
    }

    auxContainer.addChild(initialBlock);

    return {
        name: levels[levelIndex].name,
        index: levelIndex,
        startTime: Date.now(),
        endTime: 0,
        container: auxContainer,
        blockIsMoving: false,
        startBlock: {
            size: initialBlockStartSize,
            color: initialBlockStartColor
        },
        finalBlock: {
            size: finalBlockSize,
            color: finalBlockColor
        },
        modifiers: modifiersTemp
    };
}

function blockClick() {
    if (someModifierHasNoEffect()) {
        return;
    }

    if (appCurrentLevel.blockIsMoving) {
        return;
    }

    gameTimeline.add(moveBlockAlong());
    appCurrentLevel.blockIsMoving = true;
}

function selectorClick(id) {
    selectorModifierNext(id);
}

function someModifierHasNoEffect() {
    for (const mod in appCurrentLevel.modifiers) {
        if (appCurrentLevel.modifiers[mod].type === ModifierSelectorType &&
            appCurrentLevel.modifiers[mod].currOptionIndex === -1) {
            return true;
        }
    }

    return false;
}

function moveBlockAlong() {
    appCurrentLevel.endTime = Date.now();
    let startBlock = appCurrentLevel.container.getChildByName(StartBlockTag);
    let finalBlock = appCurrentLevel.container.getChildByName(FinalBlockTag);
    let modifiersCount = levels[appCurrentLevel.index].modifiers.length;
    let modifiersPositionsX = [];
    let timeLine = gsap.timeline();

    for (let i = 0; i < modifiersCount; i++) {
        modifiersPositionsX.push(appCurrentLevel.container.getChildByName(ModifierPreTag + i.toString()).position.x);
        timeLine.to(startBlock,
            {
                duration: MoveIntervalBetweenModifiers,
                x: modifiersPositionsX[i],
                ease: "sine"
            });

        switch (appCurrentLevel.modifiers[i].type) {
            case ResizeModifierType:
                let newHeight = AppBlockSize * appCurrentLevel.modifiers[i].size;
                appCurrentLevel.startBlock.size = appCurrentLevel.modifiers[i].size;
                timeLine.to(startBlock, {
                    duration: ModifierTransitionInterval,
                    height: newHeight,
                    ease: "bounce"
                });
                break;

            case ColorizeModifierType:
                appCurrentLevel.startBlock.color = appCurrentLevel.modifiers[i].color;
                timeLine.to(startBlock, {
                    duration: ModifierTransitionInterval,
                    pixi: { fillColor: appCurrentLevel.modifiers[i].color }
                });
                break;

            case ModifierSelectorType:
                let currentOptionIndex = appCurrentLevel.modifiers[i].currOptionIndex;
                let currentOption = appCurrentLevel.modifiers[i].options[currentOptionIndex];
                switch (currentOption.type) {
                    case ResizeModifierType:
                        let newHeight = AppBlockSize * currentOption.size;
                        appCurrentLevel.startBlock.size = currentOption.size;
                        timeLine.to(startBlock, {
                            duration: ModifierTransitionInterval,
                            height: newHeight,
                            ease: "bounce"
                        });
                        break;

                    case ColorizeModifierType:
                        appCurrentLevel.startBlock.color = currentOption.color;
                        timeLine.to(startBlock, {
                            duration: ModifierTransitionInterval,
                            pixi: { fillColor: currentOption.color },
                        });
                        break;
                }
                break;
        }
    }

    timeLine.to(startBlock,
        {
            duration: MoveIntervalBetweenModifiers,
            x: finalBlock.x,
            ease: "sine",
            onComplete: function () {
                if (assertBlocks(appCurrentLevel.startBlock, appCurrentLevel.finalBlock)) {
                    sendScore(
                        appCurrentLevel.name,
                        appCurrentLevel.startTime,
                        appCurrentLevel.endTime);
                    endGameUI.visible = true;
                }
                else {
                    reloadLevel();
                }
            }
        });

    return timeLine;
}

function nextLevel() {
    let nextLevelIndex = appCurrentLevel.index + 1;

    if (nextLevelIndex >= levels.length) {
        nextLevelIndex = 0;
    }

    gameTimeline.clear();
    app.stage.removeChild(appCurrentLevel.container, endGameUI);
    appCurrentLevel = buildLevel(nextLevelIndex);
    endGameUI = buildEndGameMenu(app.renderer.width);
    app.stage.addChild(appCurrentLevel.container, endGameUI);
}

function sendScore(levelName, startTime, endTime) {
    let diff = endTime - startTime;
    let data = JSON.stringify({
        levelName: levelName,
        score: diff
    });

    // let request = new XMLHttpRequest();
    // request.open("POST", "https://teste.pushstart.com.br/api/blocks/scores", false);
    // request.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    // request.send(data);
}

function reloadLevel() {
    app.stage.removeChild(appCurrentLevel.container);
    appCurrentLevel = buildLevel(appCurrentLevel.index);
    app.stage.addChild(appCurrentLevel.container);
}

function assertBlocks(start, final) {
    if (start.size !== final.size)
        return false;

    if (start.color !== final.color)
        return false;

    return true;
}

function stringHEXtoHEX(stringValue) {
    return parseInt(stringValue.replace(/^#/, ''), 16);
}

function formatOptionsColorsToHEX(options) {
    let swapOptions = [];
    for (let i in options) {
        swapOptions.push({ ...options[i] });
        if (swapOptions[i].type === ColorizeModifierType) {
            swapOptions[i].color = stringHEXtoHEX(swapOptions[i].color);
        }
    }

    return swapOptions;
}

function buildStartBlock(color, size) {
    let block = new PIXI.Graphics();

    block.beginFill(color);
    block.drawRect(0, 0, AppBlockSize, AppBlockSize * size);
    block.endFill();
    block.pivot.set(block.width / 2, block.height / 2);

    return block;
}

function buildFinalBlock(color, size) {
    let block = new PIXI.Graphics();

    block.lineStyle(2, 0xA8A8A8);
    block.beginFill(color);
    block.drawRect(0, 0, AppBlockSize, AppBlockSize * size);
    block.endFill();
    block.pivot.set(block.width / 2, block.height / 2);

    return block;
}

function buildColorizeModifier(id, color) {
    let block = new PIXI.Graphics();
    block.lineStyle(1, 0xFFFFFF, 1);
    block.beginFill(color);
    block.drawRect(0, 0, AppBlockSize, AppBlockSize);
    block.endFill();
    block.pivot.set(block.width / 2, block.height / 2);
    block.name = ModifierPreTag + id;

    return block;
}

function drawColorizeModifier(container, color) {
    let block = new PIXI.Graphics();
    block.lineStyle(1, 0xFFFFFF, 1);
    block.beginFill(color);
    block.drawRect(0, 0, AppBlockSize, AppBlockSize);
    block.endFill();

    container.addChild(block);

    return container;
}

function buildResizeModifier(id, size) {
    let blockContainer = new PIXI.Container();
    let block = new PIXI.Graphics();
    let topTriangle;
    let bottomTriangle;

    block = new PIXI.Graphics();
    block.lineStyle(1, 0xFFFFFF, 1);
    block.beginFill();
    block.drawRect(0, 0, AppBlockSize, AppBlockSize);
    block.endFill();

    switch (size) {
        case 1:
            topTriangle = new PIXI.Graphics();
            topTriangle.beginFill(0xffffff);
            topTriangle.drawPolygon([0, AppBlockSize / 2, AppBlockSize / 2, 0, AppBlockSize, AppBlockSize / 2]);
            topTriangle.endFill();
            topTriangle.pivot.set(topTriangle.width / 2, topTriangle.height / 2);
            topTriangle.position.set(AppBlockSize / 2, (AppBlockSize / 3));
            topTriangle.scale.set(0.6, 0.6);
            topTriangle.angle = 180;

            bottomTriangle = topTriangle.clone();
            bottomTriangle.pivot.set(bottomTriangle.width / 2, bottomTriangle.height / 2);
            bottomTriangle.position.set(AppBlockSize / 2, (AppBlockSize / 3) * 2);
            bottomTriangle.scale.set(0.6, 0.6);

            blockContainer.addChild(block);
            blockContainer.addChild(topTriangle);
            blockContainer.addChild(bottomTriangle);

            blockContainer.pivot.set(blockContainer.width / 2, blockContainer.height / 2);

            blockContainer.name = ModifierPreTag + id;
            break;
        case 2:
            topTriangle = new PIXI.Graphics();
            topTriangle.beginFill(0xffffff);
            topTriangle.drawPolygon([0, AppBlockSize / 2, AppBlockSize / 2, 0, AppBlockSize, AppBlockSize / 2]);
            topTriangle.endFill();
            topTriangle.pivot.set(topTriangle.width / 2, topTriangle.height / 2);
            topTriangle.position.set(AppBlockSize / 2, (AppBlockSize / 3));
            topTriangle.scale.set(0.6, 0.6);

            bottomTriangle = topTriangle.clone();
            bottomTriangle.pivot.set(bottomTriangle.width / 2, bottomTriangle.height / 2);
            bottomTriangle.position.set(AppBlockSize / 2, (AppBlockSize / 3) * 2);
            bottomTriangle.scale.set(0.6, 0.6);
            bottomTriangle.angle = 180;

            blockContainer.addChild(block);
            blockContainer.addChild(topTriangle);
            blockContainer.addChild(bottomTriangle);

            blockContainer.pivot.set(blockContainer.width / 2, blockContainer.height / 2);

            blockContainer.name = ModifierPreTag + id;
            break;
    }

    return blockContainer;
}

function drawResizeModifier(container, size) {
    let block = new PIXI.Graphics();
    let topTriangle;
    let bottomTriangle;

    block = new PIXI.Graphics();
    block.lineStyle(1, 0xFFFFFF, 1);
    block.beginFill();
    block.drawRect(0, 0, AppBlockSize, AppBlockSize);
    block.endFill();

    switch (size) {
        case 1:
            topTriangle = new PIXI.Graphics();
            topTriangle.beginFill(0xffffff);
            topTriangle.drawPolygon([0, AppBlockSize / 2, AppBlockSize / 2, 0, AppBlockSize, AppBlockSize / 2]);
            topTriangle.endFill();
            topTriangle.pivot.set(topTriangle.width / 2, topTriangle.height / 2);
            topTriangle.position.set(AppBlockSize / 2, (AppBlockSize / 3));
            topTriangle.scale.set(0.6, 0.6);
            topTriangle.angle = 180;

            bottomTriangle = topTriangle.clone();
            bottomTriangle.pivot.set(bottomTriangle.width / 2, bottomTriangle.height / 2);
            bottomTriangle.position.set(AppBlockSize / 2, (AppBlockSize / 3) * 2);
            bottomTriangle.scale.set(0.6, 0.6);
            break;
        case 2:
            topTriangle = new PIXI.Graphics();
            topTriangle.beginFill(0xffffff);
            topTriangle.drawPolygon([0, AppBlockSize / 2, AppBlockSize / 2, 0, AppBlockSize, AppBlockSize / 2]);
            topTriangle.endFill();
            topTriangle.pivot.set(topTriangle.width / 2, topTriangle.height / 2);
            topTriangle.position.set(AppBlockSize / 2, (AppBlockSize / 3));
            topTriangle.scale.set(0.6, 0.6);

            bottomTriangle = topTriangle.clone();
            bottomTriangle.pivot.set(bottomTriangle.width / 2, bottomTriangle.height / 2);
            bottomTriangle.position.set(AppBlockSize / 2, (AppBlockSize / 3) * 2);
            bottomTriangle.scale.set(0.6, 0.6);
            bottomTriangle.angle = 180;
            break;
    }

    container.addChild(block);
    container.addChild(topTriangle);
    container.addChild(bottomTriangle);
    container.pivot.set(container.width / 2, container.height / 2);

    return container;
}

function setupModifierSelector(id, types) {
    let block = new PIXI.Graphics();
    block.lineStyle(1, 0xFFFFFF, 1);
    block.beginFill();
    block.drawRect(0, 0, AppBlockSize, AppBlockSize);
    block.endFill();
    block.pivot.set(block.width / 2, block.height / 2);
    block.name = ModifierPreTag + id;

    return block;
}

function selectorModifierNext(nameId) {
    if (appCurrentLevel.blockIsMoving) {
        return;
    }

    let targetModifier = findModifierById(nameId);
    if (targetModifier === null) {
        return;
    }

    let optionIndex = targetModifier.currOptionIndex + 1;
    let optionsCount = targetModifier.options.length;

    if (optionIndex >= optionsCount) {
        optionIndex = 0;
    }

    targetModifier.container.clear();
    if (targetModifier.options[optionIndex].type === ResizeModifierType) {
        targetModifier.container = drawResizeModifier(targetModifier.container, targetModifier.options[optionIndex].size);
    }
    else if (targetModifier.options[optionIndex].type === ColorizeModifierType) {
        targetModifier.container = drawColorizeModifier(targetModifier.container, targetModifier.options[optionIndex].color);
    }
    targetModifier.currOptionIndex = optionIndex;
}

function bindReplay(onSeekbarUpdate){
    let tweens = gameTimeline.getChildren();
    for (let i in tweens) {
        tweens[i].eventCallback("onComplete", null);
    }
    gameTimeline.eventCallback("onUpdate", () => {
        onSeekbarUpdate(gameTimeline.progress());
    });
}

function playReplay() {
    gameTimeline.play(0);
}

function seekReplay(position) {
    if (position > 1) {
        position = 1;
    }
    if (position < 0) {
        position = 0;
    }

    let cursorPosition = gameTimeline.totalDuration() * position;
    gameTimeline.play(cursorPosition);
}

function findModifierById(nameId) {
    for (const i in appCurrentLevel.modifiers) {
        if (appCurrentLevel.modifiers[i].nameId === nameId) {
            return appCurrentLevel.modifiers[i];
        }
    }

    return null;
}