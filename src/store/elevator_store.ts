import { ElevatorModel } from "../mock/ldoop_mock.js";

// In-Memory Store – hält alle erstellten Aufzugsmodelle für die Session
const store = new Map<string, ElevatorModel>();

export function saveElevator(model: ElevatorModel): void {
  store.set(model.model_id, model);
}

export function getElevator(model_id: string): ElevatorModel | undefined {
  return store.get(model_id);
}

export function listElevators(): ElevatorModel[] {
  return Array.from(store.values());
}
