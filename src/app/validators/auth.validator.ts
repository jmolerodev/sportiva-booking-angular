import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";


export function customEmailValidator(): ValidatorFn {

    return (control: AbstractControl): ValidationErrors | null => {

        /* Cogemos el valor actual del campo como un string */
        const email = control.value as string;

        /* Si está vacío devolvemos null, sin error, para no molestar al usuario antes de que escriba */
        if (!email) {
            return null;
        }


        const simpleEmailRegex = /^[^@]+@[^@]+\.[a-zA-Z]{2,}$/;

        /* Si cumple la regex → null (válido). Si no → objeto de error que Angular interpreta como fallo */
        return simpleEmailRegex.test(email) ? null : { 'invalidEmail': true };

    };
}


export function customPasswordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {

        /*Cogemos el valor actual del campo como un string*/
        const password = control.value as string;

        /* Si está vacío devolvemos null, sin error, para no molestar al usuario antes de que escriba */
        if (!password) {
            return null;
        }

        /*Expresión regular: al menos 9 caracteres, 1 mayúscula, 1 minúscula y 1 número*/
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{9,}$/;
        return passwordRegex.test(password) ? null : { 'invalidPassword': true };

    }
}

