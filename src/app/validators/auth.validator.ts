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
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\W]{9,}$/;
        return passwordRegex.test(password) ? null : { 'invalidPassword': true };

    }
}


/**
 * Validator de grupo que comprueba en tiempo real si los campos
 * 'password' y 'confirmPassword' del formulario coinciden.
 * Se aplica al FormGroup completo, no a un campo individual.
 * Si no coinciden, inyecta el error 'passwordMismatch' directamente
 * en el campo confirmPassword para que el template pueda pintarlo.
 */
export function passwordsMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {

        const password        = group.get('password')?.value;
        const confirmPassword = group.get('confirmPassword')?.value;

        /*Si confirmPassword está vacío no molestamos al usuario todavía*/
        if (!confirmPassword) {
            return null;
        }

        if (password !== confirmPassword) {
            /*Inyectamos el error en el campo confirmPassword para que el template lo detecte*/
            group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
            return { passwordMismatch: true };
        }

        /*Si coinciden limpiamos el error de passwordMismatch (manteniendo otros errores si los hubiera)*/
        const errors = group.get('confirmPassword')?.errors;
        if (errors) {
            delete errors['passwordMismatch'];
            const tieneOtrosErrores = Object.keys(errors).length > 0;
            group.get('confirmPassword')?.setErrors(tieneOtrosErrores ? errors : null);
        }

        return null;

    };
}