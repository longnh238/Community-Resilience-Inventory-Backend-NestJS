import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../users/users.decorator';

@Injectable()
export class HelpersService {
    constructor(
        private readonly configService: ConfigService,
    ) { }

    async cipherText(text: string): Promise<string> {
        const myCipher = await this.cipher();
        return myCipher(text);
    }

    async decipherText(text: string): Promise<any> {
        const myDecipher = await this.decipher();
        return myDecipher(text);
    }

    async cipher(): Promise<any> {
        const salt = this.configService.get<string>('salt');
        const textToChars = text => text.split('').map(c => c.charCodeAt(0));
        const byteHex = n => ("0" + Number(n).toString(16)).substr(-2);
        const applySaltToChar = code => textToChars(salt).reduce((a, b) => a ^ b, code);

        return text => text.split('')
            .map(textToChars)
            .map(applySaltToChar)
            .map(byteHex)
            .join('');
    }

    async decipher(): Promise<any> {
        const salt = this.configService.get<string>('salt');
        const textToChars = text => text.split('').map(c => c.charCodeAt(0));
        const applySaltToChar = code => textToChars(salt).reduce((a, b) => a ^ b, code);
        return encoded => encoded.match(/.{1,2}/g)
            .map(hex => parseInt(hex, 16))
            .map(applySaltToChar)
            .map(charCode => String.fromCharCode(charCode))
            .join('');
    }

    async hasDuplicates(array): Promise<boolean> {
        if (array) {
            return (new Set(array)).size != array.length;
        } else {
            return false;
        }
    }

    async whoAmI(@AuthUser() authUser: any): Promise<String> {
        return authUser.username;
    }

    async makeRandomString(passwordLength: number, haveNumericDigits: boolean, haveUppercaseLetters: boolean, haveSpecialCharacters: boolean): Promise<string> {
        let result = '';
        let characters = 'abcdefghijklmnopqrstuvwxyz';
        if (haveUppercaseLetters) characters += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (haveNumericDigits) characters += '0123456789';
        if (haveSpecialCharacters) characters += '!@#$%^&* ()';
        const charactersLength = characters.length;
        for (var i = 0; i < passwordLength; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    async buildScenarioIndicatorProxyId(resilocScenarioId: string, resilocIndicatorId: string, resilocProxyId: string): Promise<string> {
        return resilocScenarioId.split('-')[0]
            + '-'
            + resilocScenarioId.split('-')[1]
            + '-'
            + resilocIndicatorId.split('-')[0]
            + '-'
            + resilocIndicatorId.split('-')[1]
            + '-'
            + resilocProxyId.split('-')[0];
    }

    async validateEmail(text): Promise<boolean> {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(text).toLowerCase());
    }
}
