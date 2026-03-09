export abstract class DomainEntity {

    /*Atributos de la Clase*/
    id: string;

    /*Constructor de la Clase*/
    constructor(id: string) {
        this.id = id;
    }

    /*Getters y Setters de la Clase*/
    getId() {
        return this.id;
    }

    setId(id: string) {
        this.id = id;
    }

}