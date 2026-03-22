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

}