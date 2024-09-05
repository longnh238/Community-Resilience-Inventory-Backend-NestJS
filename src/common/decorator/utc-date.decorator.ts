import { Column, ColumnOptions, ColumnType } from 'typeorm';
import { ColumnEmbeddedOptions } from 'typeorm/decorator/options/ColumnEmbeddedOptions';
import { ValueTransformer } from 'typeorm/decorator/options/ValueTransformer';

// Custom decorator to automatically set column type to 'timestamp' and the transformer to our UTCDateTransformer
export function UTCDateColumn(typeOrOptions?: ((type?: any) => Function) | ColumnType | (ColumnOptions & ColumnEmbeddedOptions), options?: (ColumnOptions & ColumnEmbeddedOptions)): Function {
    return function (object: Object, propertyName: string) {
        // normalize parameters
        let type: ColumnType | undefined;
        if (typeof typeOrOptions == 'string' || typeOrOptions instanceof Function) {
            type = <ColumnType>typeOrOptions || 'timestamp';
        } else if (typeOrOptions) {
            options = <ColumnOptions>typeOrOptions;
            type = typeOrOptions.type || 'timestamp';
        }
        if (!options) options = {} as ColumnOptions;
        options.transformer = UTCDateTransformer;

        return Column(<any>type, options)(object, propertyName);
    };
}

export const UTCDateTransformer: ValueTransformer = {
    to(value: any): any {
        return (typeof value != 'string' ? (<Date>value).toISOString() : value).replace('Z', '');
    },
    from(value: any): any {
        return (typeof value == 'string' ? new Date(value.indexOf('Z') != -1 ? value : value + 'Z') : value);
    }
};