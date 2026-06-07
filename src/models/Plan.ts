export class AppPlan {
    static readonly PERSONAL = new AppPlan("Personal");
    static readonly PRO = new AppPlan("Pro");
    static readonly LIFETIME = new AppPlan("Lifetime");

    constructor(public readonly name: string) {}

    get isPro(): boolean {
        const n = this.name.toLowerCase();
        return n === "pro" || n === "lifetime";
    }

    get isPersonal(): boolean {
        return this.name.toLowerCase() === "personal";
    }

    get isTeam(): boolean {
        return this.name.toLowerCase() === "team";
    }

    static fromString(p: string | null): AppPlan | null {
        if (!p) return null;
        switch (p.toLowerCase()) {
            case 'personal': return AppPlan.PERSONAL;
            case 'pro': return AppPlan.PRO;
            case 'lifetime': return AppPlan.LIFETIME;
            default: return new AppPlan(p);
        }
    }

    toString(): string {
        return this.name;
    }
}
