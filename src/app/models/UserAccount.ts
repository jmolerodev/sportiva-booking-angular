import { DomainEntity } from "./DomainEntity";

export class UserAccount extends DomainEntity {

    /*Atributos de la Clase*/
    email: string;
    password: string;

    /*Constructor de la Clase*/
    constructor(id: string, email: string, password: string) {
        super(id);
        this.email = email;
        this.password = password;
    }

    /*Getters y Setters de la Clase*/
    getEmail() {
        return this.email;
    }

    setEmail(email: string) {
        this.email = email;
    }

    getPassword() {
        return this.password;
    }

    setPassword(password: string) {
        this.password = password;
    }

}