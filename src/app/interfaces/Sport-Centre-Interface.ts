export interface IHorarioDia {
  abierto:  boolean;
  apertura: string;
  cierre:   string;
}

export interface IHorarioSemana {
  [key: string]: IHorarioDia;
}

export interface ISportCentre {
  nombre:            string;
  direccion:         string;
  telefono:          string;
  foto:              string;
  adminUid:          string;
  horario:           IHorarioSemana;
  profesionalesUids?: string[]; 
}