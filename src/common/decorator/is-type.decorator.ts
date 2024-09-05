import { registerDecorator, ValidationArguments, ValidationOptions, Validator } from "class-validator";


const typeValidator = {
     "string": function (value: any, args: ValidationArguments) {
          return (typeof value == 'string');
     },
     "number": function (value: any, args: ValidationArguments) {
          return (typeof value == 'number');
     }
     // Add more here
};

export function IsType(types: (keyof (typeof typeValidator))[], validationOptions?: ValidationOptions) {
     return function (object: Object, propertyName: string) {
          registerDecorator({
               name: "wrongType",
               target: object.constructor,
               propertyName: propertyName,
               options: validationOptions,
               validator: {
                    validate(value: any, args: ValidationArguments) {
                         return types.some(v => typeValidator[v](value, args));
                    },
                    defaultMessage(validationArguments?: ValidationArguments) {
                         const cloneTypes = types.map(type => {
                              return type;
                         });
                         const lastType = cloneTypes.pop();
                         if (cloneTypes.length == 0)
                              return `${propertyName} must be a ${lastType}`;
                         return `${propertyName} must be a ${cloneTypes.join(", ")} or ${lastType}.`;
                    }
               }
          });
     };
}
