export class Organization<TName extends string> {
  constructor(
    public id: string,
    public name: TName,
  ) {}
}
