type OmarchyTemporalNow = {
  zonedDateTimeISO: () => {
    day: number;
    dayOfWeek: number;
    hour: number;
    millisecond: number;
    minute: number;
    month: number;
    offset?: string;
    second: number;
    year: number;
  };
};

declare var Temporal:
  | {
      Now?: OmarchyTemporalNow;
    }
  | undefined;
