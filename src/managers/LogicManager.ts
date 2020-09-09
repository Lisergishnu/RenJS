import {Group} from 'phaser';
import RJS from '../core/RJS';
import RJSManagerInterface from './RJSManager';

export interface LogicManagerInterface<T> extends RJSManagerInterface {
    choicesLog: object;
    vars: object;
    currentChoices: any[];
    interrupting: boolean;
    visualChoices?: T;
}

export default class LogicManager implements LogicManagerInterface<Group> {
    choicesLog: object;
    vars: object = {};
    currentChoices: any[];
    interrupting: boolean;
    visualChoices: Group = null;
    private game: RJS

    constructor(game: RJS) {
        this.game = game

        const log = localStorage.getItem('RenJSChoiceLog'+game.config.name);
        this.choicesLog = log ? JSON.parse(log) : {};
    }

    set(vars): void {
        this.vars = vars;
        this.currentChoices = [];
        this.interrupting = false;
        if (this.visualChoices){
            this.visualChoices.destroy();
        }
    }

    setVar(name, value): void {
        value = value+'';
        value = this.parseVars(value);
        try {
            // eslint-disable-next-line no-eval
            this.vars[name] = eval(value);
        } catch(e) {
            this.vars[name] = value;
        }
    }

    evalExpression(expression): any {
        expression = expression + '';
        expression = this.parseVars(expression,true);
        try {
            // eslint-disable-next-line no-eval
            return eval(expression);
        } catch(e) {
            return false;
        }
    }

    branch(expression, branches): void {
        const val = this.evalExpression(expression);
        let actions;
        if (val && branches.ISTRUE){
            actions = branches.ISTRUE;
        }
        if (!val && branches.ISFALSE){
            this.game.control.execStack[0].c++;
            actions = branches.ISFALSE;
        }
        if(actions){
            this.game.managers.story.currentScene = actions.concat(this.game.managers.story.currentScene);
            this.game.control.execStack.unshift({c:-1, total: actions.length, action: 'if'});
        }
    }

    parseVars(text, useQM?): string {
        const vars = text.match(/\{(.*?)\}/g);
        if (vars) {
            for (const v of vars){
                const varName = v.substring(1,v.length-1);
                let value = this.vars[varName]
                if (useQM && typeof value == 'string'){
                    value = '\"'+value+'\"';
                }
                text = text.replace(v,value);
            }
        }
        return text;
    }

    evalChoice(choice): any {
        const choiceText = Object.keys(choice)[0];
        choice.choiceId = 'Choice'+ guid();
        choice.choiceText = choiceText;
        const params = choiceText.split('!if');
        if (params.length > 1){
            const val = this.evalExpression(params[1]);
            if (val) {
                const next = choice[choiceText];
                delete choice[choiceText];
                choice.choiceText = params[0];
                choice[params[0]] = next;
            }
            return val;
        }
        return true; // unconditional choice
    }

    showVisualChoices(choices): void {
        // clone
        const ch = choices.map(choice => ({...choice}));
        // filter (eval choice modifies the choice adding id and clearing text)
        this.currentChoices = ch.filter(this.evalChoice);
        this.visualChoices = this.game.add.group();
        const execId = this.getExecStackId();
        for (let i = 0; i < this.currentChoices.length; i++) {
            const key = Object.keys(this.currentChoices[i])[0];
            const str = key.split(' ');
            const pos = str[2].split(',');
            const position = {x: parseInt(pos[0], 10), y: parseInt(pos[1], 10)};
            this.createVisualChoice(str[0],position,i,key,execId);
        }
    }

    createVisualChoice(image, position, index, key, execId): void {
        const button = this.game.add.button(position.x,position.y,image,() => {
            this.choose(index,key,execId);
        },this,0,0,0,0,this.visualChoices);

        if (this.game.gui.getChosenOptionColor && this.choicesLog[execId].indexOf(key) !== -1){
            button.tint = this.game.gui.getChosenOptionColor();
            // previously chosen choice
        }
        button.anchor.set(0.5);
    }

    choose(index, chosenOption, execId): void {
        this.choicesLog[execId].push(chosenOption);
        if (this.visualChoices){
            this.visualChoices.destroy();
        }
        if (chosenOption){
            const actions = this.currentChoices[index][chosenOption];
            this.game.managers.story.currentScene = actions.concat(this.game.managers.story.currentScene);
            this.game.control.execStack.unshift({c:-1, index, op: chosenOption, total:actions.length, action:'choice'});
        }
        this.currentChoices = [];
        if (this.interrupting){
            this.game.control.execStack[0].action = 'interrupt';
            this.interrupting = false;
        } else {
            this.game.resolveAction();
        }
    }


    getExecStackId(): string {
        const cAction = this.game.control.execStack[this.game.control.execStack.length-1].c;
        const cScene = this.game.control.execStack[this.game.control.execStack.length-1].scene;
        return 'Scene:'+cScene+'|Action:'+cAction;
    }

    showChoices(choices): void {
        const ch = choices.map(choice => ({...choice})).filter(choice => this.evalChoice(choice))
        this.currentChoices = this.currentChoices.concat(ch);
        // Update choice log
        const execId = this.getExecStackId();
        if (!this.choicesLog[execId]){
            this.choicesLog[execId]=[];
        }
        // END Update choice log
        this.game.gui.showChoices(this.currentChoices,execId);
    }

    interrupt(steps, choices): any {
        this.interrupting = true;
        const s = parseInt(steps, 10);
        if (!isNaN(s) && s>0){
            choices.forEach(choice => {
                choice.remainingSteps = s+1;
                choice.interrupt = true;
            })
            this.game.interruptAction = (): any => {
                this.currentChoices = this.currentChoices.filter(choice => {
                    if (choice.remainingSteps) {
                        choice.remainingSteps--;
                        if (choice.remainingSteps === 1){
                            this.game.gui.changeToLastInterrupt(choice.choiceId);
                        } else if (choice.remainingSteps === 0){
                            this.game.gui.hideChoice(choice.choiceId);
                            return false;
                        }
                    }
                    return true;
                },this);
                if (this.currentChoices.length === 0){
                   this.game.interruptAction = null;
                }
            }
        }

        const execId = this.getExecStackId();
        if (!this.choicesLog[execId]){
            this.choicesLog[execId]=[];
        }
        this.showChoices(choices);
        this.game.control.execStack[0].interrupting = this.game.control.execStack[0].c;
    }

    clearChoices(): any {
        this.game.gui.hideChoices();
        this.currentChoices = [];
        this.interrupting = false;
        if (this.visualChoices){
            this.visualChoices.destroy();
        }
    }
}

function guid(): string {
    return 'ss'.replace(/s/g, s4);
}

function s4(): string {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}
