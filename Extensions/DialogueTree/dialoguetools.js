var gdjs;
(function(gdjs2) {
  gdjs2.dialogueTree = {};
  gdjs2.dialogueTree.runner = new bondage.Runner();
  gdjs2.dialogueTree.loadFromSceneVariable = function(sceneVar, startDialogueNode) {
    this.runner = gdjs2.dialogueTree.runner;
    try {
      this.yarnData = JSON.parse(sceneVar.getAsString());
      this.runner.load(this.yarnData);
      if (startDialogueNode && startDialogueNode.length > 0) {
        gdjs2.dialogueTree.startFrom(startDialogueNode);
      }
    } catch (e) {
      console.error(e);
    }
  };
  gdjs2.dialogueTree.loadFromJsonFile = function(runtimeScene, jsonResourceName, startDialogueNode) {
    runtimeScene.getGame().getJsonManager().loadJson(jsonResourceName, function(error, content) {
      if (error) {
        console.error("An error happened while loading JSON resource:", error);
      } else {
        if (!content) {
          return;
        }
        gdjs2.dialogueTree.yarnData = content;
        try {
          gdjs2.dialogueTree.runner.load(gdjs2.dialogueTree.yarnData);
        } catch (error2) {
          console.error("An error happened while loading parsing the dialogue tree data:", error2);
        }
        if (startDialogueNode && startDialogueNode.length > 0) {
          gdjs2.dialogueTree.startFrom(startDialogueNode);
        }
      }
    });
  };
  gdjs2.dialogueTree.stopRunningDialogue = function() {
    if (this.dialogueIsRunning) {
      this.dialogueIsRunning = false;
    }
    if (this.dialogueData) {
      this.dialogueData = null;
    }
    this.dialogueText = "";
    this.clipTextEnd = 0;
  };
  gdjs2.dialogueTree.isRunning = function() {
    if (this.dialogueIsRunning && !this.dialogueData && this.dialogueText && this.clipTextEnd >= this.dialogueText.length) {
      this.dialogueIsRunning = false;
    }
    return this.dialogueIsRunning;
  };
  gdjs2.dialogueTree.scrollClippedText = function() {
    if (this.pauseScrolling || !this.dialogueIsRunning) {
      return;
    }
    if (gdjs2.dialogueTree._isLineTypeCommand() && this.dialogueDataType === "text" && this.dialogueBranchTitle === this.dialogueData.data.title && this.lineNum === this.dialogueData.lineNum && gdjs2.dialogueTree.hasClippedScrollingCompleted()) {
      gdjs2.dialogueTree.goToNextDialogueLine();
      return;
    }
    if (this.dialogueText && this.dialogueDataType === "text" && this.clipTextEnd < this.dialogueText.length) {
      this.clipTextEnd += 1;
    }
  };
  gdjs2.dialogueTree.completeClippedTextScrolling = function() {
    if (this.pauseScrolling || !this.dialogueIsRunning || !this.dialogueText || this.dialogueDataType !== "text") {
      return;
    }
    this.clipTextEnd = this.dialogueText.length;
  };
  gdjs2.dialogueTree.hasClippedScrollingCompleted = function() {
    if (!this.dialogueIsRunning || this.dialogueDataType === "") {
      return false;
    }
    if (this.dialogueData && this.dialogueText.length > 0 && this.clipTextEnd >= this.dialogueText.length) {
      if (gdjs2.dialogueTree.getVariable("debug")) {
        console.warn("Scroll completed:", this.clipTextEnd, "/", this.dialogueText.length);
      }
      return true;
    }
    return false;
  };
  gdjs2.dialogueTree.getClippedLineText = function() {
    return this.dialogueIsRunning && this.dialogueText.length ? this.dialogueText.substring(0, this.clipTextEnd + 1) : "";
  };
  gdjs2.dialogueTree.getLineText = function() {
    return this.dialogueIsRunning && this.dialogueText.length ? this.dialogueText : "";
  };
  gdjs2.dialogueTree.commandParametersCount = function() {
    if (this.commandParameters && this.commandParameters.length > 1) {
      return this.commandParameters.length - 1;
    }
    return 0;
  };
  gdjs2.dialogueTree.getCommandParameter = function(paramIndex) {
    if (paramIndex === -1 && this.commandParameters.length > 0) {
      return this.commandParameters[0];
    }
    if (this.commandParameters && this.commandParameters.length >= paramIndex + 1) {
      const returnedParam = this.commandParameters[paramIndex + 1];
      return returnedParam ? returnedParam : "";
    }
    return "";
  };
  gdjs2.dialogueTree.isCommandCalled = function(command) {
    if (!this.dialogueIsRunning) {
      return false;
    }
    const commandCalls = gdjs2.dialogueTree.commandCalls;
    const clipTextEnd = gdjs2.dialogueTree.clipTextEnd;
    const dialogueText = gdjs2.dialogueTree.dialogueText;
    if (this.pauseScrolling || !commandCalls) {
      return false;
    }
    return this.commandCalls.some(function(call, index) {
      if (clipTextEnd !== 0 && clipTextEnd < call.time) {
        return false;
      }
      if (call.cmd === "wait" && (clipTextEnd === 0 || clipTextEnd !== dialogueText.length)) {
        gdjs2.dialogueTree.pauseScrolling = true;
        setTimeout(function() {
          gdjs2.dialogueTree.pauseScrolling = false;
          commandCalls.splice(index, 1);
          if (gdjs2.dialogueTree.getVariable("debug")) {
            console.info("CMD:", call);
          }
        }, parseInt(call.params[1], 10));
      }
      if (call.cmd === command) {
        gdjs2.dialogueTree.commandParameters = call.params;
        commandCalls.splice(index, 1);
        if (gdjs2.dialogueTree.getVariable("debug")) {
          console.info("CMD:", call);
        }
        return true;
      }
    });
  };
  gdjs2.dialogueTree._normalizedOptionIndex = function(optionIndex) {
    if (optionIndex >= this.options.length) {
      optionIndex = this.options.length - 1;
    }
    if (optionIndex < 0) {
      optionIndex = 0;
    }
    return optionIndex;
  };
  gdjs2.dialogueTree._cycledOptionIndex = function(optionIndex) {
    if (optionIndex >= this.options.length) {
      optionIndex = 0;
    }
    if (optionIndex < 0) {
      optionIndex = this.options.length - 1;
    }
    return optionIndex;
  };
  gdjs2.dialogueTree.getLineOption = function(optionIndex) {
    if (!this.dialogueIsRunning || !this.options.length) {
      return [];
    }
    optionIndex = gdjs2.dialogueTree._normalizedOptionIndex(optionIndex);
    return this.options[optionIndex];
  };
  gdjs2.dialogueTree.getLineOptionsText = function(optionSelectionCursor, addNewLine) {
    if (!this.dialogueIsRunning || !this.options.length) {
      return "";
    }
    let textResult = "";
    this.options.forEach(function(optionText, index) {
      if (index === gdjs2.dialogueTree.selectedOption) {
        textResult += optionSelectionCursor;
      } else {
        textResult += optionSelectionCursor.replace(/.*/g, " ");
      }
      textResult += optionText;
      if (addNewLine) {
        textResult += "\n";
      }
    });
    return textResult;
  };
  gdjs2.dialogueTree.getLineOptionsTextHorizontal = function(optionSelectionCursor) {
    return this.getLineOptionsText(optionSelectionCursor, false);
  };
  gdjs2.dialogueTree.getLineOptionsTextVertical = function(optionSelectionCursor) {
    return this.getLineOptionsText(optionSelectionCursor, true);
  };
  gdjs2.dialogueTree.getLineOptionsCount = function() {
    if (this.dialogueIsRunning && this.options.length) {
      return this.optionsCount;
    }
    return 0;
  };
  gdjs2.dialogueTree.confirmSelectOption = function() {
    if (!this.dialogueIsRunning) {
      return;
    }
    if (this.dialogueData.select && !this.selectedOptionUpdated && this.selectedOption !== -1) {
      this.commandCalls = [];
      try {
        this.dialogueData.select(this.selectedOption);
        this.dialogueData = this.dialogue.next().value;
        gdjs2.dialogueTree.goToNextDialogueLine();
      } catch (error) {
        console.error(`An error happened when trying to access the dialogue branch!`, error);
      }
    }
  };
  gdjs2.dialogueTree.selectNextOption = function() {
    if (!this.dialogueIsRunning) {
      return;
    }
    if (this.dialogueData.select) {
      this.selectedOption += 1;
      this.selectedOption = gdjs2.dialogueTree._cycledOptionIndex(this.selectedOption);
      this.selectedOptionUpdated = true;
    }
  };
  gdjs2.dialogueTree.selectPreviousOption = function() {
    if (!this.dialogueIsRunning) {
      return;
    }
    if (this.dialogueData.select) {
      this.selectedOption -= 1;
      this.selectedOption = gdjs2.dialogueTree._cycledOptionIndex(this.selectedOption);
      this.selectedOptionUpdated = true;
    }
  };
  gdjs2.dialogueTree.selectOption = function(optionIndex) {
    if (!this.dialogueIsRunning) {
      return;
    }
    if (this.dialogueData.select) {
      this.selectedOption = gdjs2.dialogueTree._normalizedOptionIndex(optionIndex);
      this.selectedOptionUpdated = true;
    }
  };
  gdjs2.dialogueTree.getSelectedOption = function() {
    if (!this.dialogueIsRunning) {
      return;
    }
    if (this.dialogueData.select) {
      return this.selectedOption;
    }
    return 0;
  };
  gdjs2.dialogueTree.hasSelectedOptionChanged = function() {
    if (this.selectedOptionUpdated) {
      this.selectedOptionUpdated = false;
      if (this.selectedOption === -1) {
        this.selectedOption = 0;
      }
      return true;
    }
    return false;
  };
  gdjs2.dialogueTree.isDialogueLineType = function(type) {
    if (!this.dialogueIsRunning) {
      return false;
    }
    if (this.commandCalls && type === "command") {
      if (this.commandCalls.some(function(call) {
        return gdjs2.dialogueTree.clipTextEnd > call.time && call.cmd === "wait";
      })) {
        return !this.pauseScrolling;
      }
      if (this.commandCalls.length > 0 && this.commandParameters.length > 0) {
        return true;
      }
    }
    return this.dialogueDataType === type;
  };
  gdjs2.dialogueTree.hasDialogueBranch = function(branchName) {
    return this.runner && this.runner.yarnNodes && Object.keys(this.runner.yarnNodes).some(function(node) {
      return node === branchName;
    });
  };
  gdjs2.dialogueTree.startFrom = function(startDialogueNode) {
    this.runner = gdjs2.dialogueTree.runner;
    if (!this.hasDialogueBranch(startDialogueNode)) {
      return;
    }
    this.optionsCount = 0;
    this.options = [];
    this.tagParameters = [];
    this.dialogue = this.runner.run(startDialogueNode);
    this.dialogueText = "";
    this.clipTextEnd = 0;
    this.commandCalls = [];
    this.commandParameters = [];
    this.pauseScrolling = false;
    this.dialogueData = this.dialogue.next().value;
    this.dialogueBranchTags = this.dialogueData.data.tags;
    this.dialogueBranchTitle = this.dialogueData.data.title;
    this.dialogueBranchBody = this.dialogueData.data.body;
    this.lineNum = this.dialogueData.lineNum;
    if (gdjs2.dialogueTree._isLineTypeText()) {
      this.dialogueDataType = "text";
    } else {
      if (gdjs2.dialogueTree._isLineTypeOptions()) {
        this.dialogueDataType = "options";
      } else {
        this.dialogueDataType = "command";
      }
    }
    this.dialogueIsRunning = true;
    gdjs2.dialogueTree.goToNextDialogueLine();
  };
  gdjs2.dialogueTree._isLineTypeText = function() {
    return this.dialogueData instanceof bondage.TextResult;
  };
  gdjs2.dialogueTree._isLineTypeOptions = function() {
    return this.dialogueData instanceof bondage.OptionsResult;
  };
  gdjs2.dialogueTree._isLineTypeCommand = function() {
    return this.dialogueData instanceof bondage.CommandResult;
  };
  gdjs2.dialogueTree.goToNextDialogueLine = function() {
    if (this.pauseScrolling || !this.dialogueIsRunning) {
      return;
    }
    this.optionsCount = 0;
    this.selectedOption = -1;
    this.selectedOptionUpdated = false;
    if (gdjs2.dialogueTree.getVariable("debug")) {
      console.info("parsing:", this.dialogueData);
    }
    if (!this.dialogueData) {
      gdjs2.dialogueTree.stopRunningDialogue();
    } else {
      if (gdjs2.dialogueTree._isLineTypeText()) {
        if (this.lineNum === this.dialogueData.lineNum && this.dialogueBranchTitle === this.dialogueData.data.title) {
          this.clipTextEnd = this.dialogueText.length - 1;
          this.dialogueText += (this.dialogueText === "" ? "" : " ") + this.dialogueData.text;
        } else {
          this.clipTextEnd = 0;
          this.dialogueText = this.dialogueData.text;
        }
        this.dialogueBranchTags = this.dialogueData.data.tags;
        this.dialogueBranchTitle = this.dialogueData.data.title;
        this.dialogueBranchBody = this.dialogueData.data.body;
        this.lineNum = this.dialogueData.lineNum;
        this.dialogueDataType = "text";
        this.dialogueData = this.dialogue.next().value;
      } else {
        if (gdjs2.dialogueTree._isLineTypeOptions()) {
          this.commandCalls = [];
          this.dialogueDataType = "options";
          this.dialogueText = "";
          this.clipTextEnd = 0;
          this.optionsCount = this.dialogueData.options.length;
          this.options = this.dialogueData.options;
          this.selectedOptionUpdated = true;
        } else {
          if (gdjs2.dialogueTree._isLineTypeCommand()) {
            this.dialogueDataType = "command";
            const command = this.dialogueData.text.split(" ");
            const offsetTime = this.commandCalls.length && this.commandCalls[this.commandCalls.length - 1].cmd === "wait" ? 1 : 0;
            this.commandCalls.push({
              cmd: command[0],
              params: command,
              time: this.dialogueText.length + offsetTime
            });
            this.dialogueData = this.dialogue.next().value;
            gdjs2.dialogueTree.goToNextDialogueLine();
          } else {
            this.dialogueDataType = "unknown";
          }
        }
      }
    }
  };
  gdjs2.dialogueTree.getBranchTitle = function() {
    if (this.dialogueIsRunning) {
      return this.dialogueBranchTitle;
    }
    return "";
  };
  gdjs2.dialogueTree.branchTitleIs = function(title) {
    if (this.dialogueIsRunning) {
      return this.dialogueBranchTitle === title;
    }
    return false;
  };
  gdjs2.dialogueTree.getBranchTags = function() {
    if (this.dialogueIsRunning) {
      return this.dialogueBranchTags.join(",");
    }
    return "";
  };
  gdjs2.dialogueTree.getBranchTag = function(index) {
    if (this.dialogueIsRunning && this.dialogueBranchTags.length) {
      if (index > this.dialogueBranchTags.length - 1) {
        index = this.dialogueBranchTags.length - 1;
      }
      return this.dialogueBranchTags[index];
    }
    return "";
  };
  gdjs2.dialogueTree.branchContainsTag = function(query) {
    this.tagParameters = [];
    if (this.dialogueIsRunning && this.dialogueBranchTags.length) {
      return this.dialogueBranchTags.some(function(tag) {
        const splitTag = tag.match(/([^\(]+)\(([^\)]+)\)/i);
        gdjs2.dialogueTree.tagParameters = splitTag ? splitTag[2].split(",") : [];
        return splitTag ? splitTag[1] === query : tag === query;
      });
    }
    return false;
  };
  gdjs2.dialogueTree.getTagParameter = function(paramIndex) {
    if (this.dialogueIsRunning && this.tagParameters.length >= paramIndex) {
      const returnedParam = this.tagParameters[paramIndex];
      return returnedParam ? returnedParam : "";
    }
    return "";
  };
  gdjs2.dialogueTree.getVisitedBranchTitles = function() {
    if (this.dialogueIsRunning) {
      return Object.keys(this.runner.visited).join(",");
    }
    return "";
  };
  gdjs2.dialogueTree.branchTitleHasBeenVisited = function(title) {
    if (!title) {
      title = this.dialogueBranchTitle;
    }
    return Object.keys(this.runner.visited).includes(title) && this.runner.visited[title];
  };
  gdjs2.dialogueTree.getBranchText = function() {
    if (this.dialogueIsRunning) {
      return this.dialogueBranchBody;
    }
    return "";
  };
  gdjs2.dialogueTree.getVariable = function(key) {
    if (this.dialogueIsRunning && key in this.runner.variables.data) {
      return this.runner.variables.get(key);
    }
    return "";
  };
  gdjs2.dialogueTree.compareVariable = function(key, value) {
    if (this.dialogueIsRunning && key in this.runner.variables.data) {
      return this.runner.variables.get(key) === value;
    }
    return false;
  };
  gdjs2.dialogueTree.setVariable = function(key, value) {
    if (this.runner.variables) {
      this.runner.variables.set(key, value);
    }
  };
  gdjs2.dialogueTree.saveState = function(outputVariable) {
    const dialogueState = {
      variables: gdjs2.dialogueTree.runner.variables.data,
      visited: gdjs2.dialogueTree.runner.visited
    };
    gdjs2.evtTools.network._objectToVariable(dialogueState, outputVariable);
  };
  gdjs2.dialogueTree.loadState = function(inputVariable) {
    const loadedState = JSON.parse(gdjs2.evtTools.network.variableStructureToJSON(inputVariable));
    if (!loadedState) {
      console.error("Load state variable is empty:", inputVariable);
      return;
    }
    try {
      gdjs2.dialogueTree.runner.visited = loadedState.visited;
      gdjs2.dialogueTree.runner.variables.data = {};
      Object.keys(loadedState.variables).forEach(function(key) {
        const value = loadedState.variables[key];
        gdjs2.dialogueTree.runner.variables.set(key, value);
      });
    } catch (e) {
      console.error("Failed to load state from variable:", inputVariable, e);
    }
  };
  gdjs2.dialogueTree.clearState = function() {
    gdjs2.dialogueTree.runner.visited = {};
    gdjs2.dialogueTree.runner.variables.data = {};
  };
})(gdjs || (gdjs = {}));
//# sourceMappingURL=dialoguetools.js.map
