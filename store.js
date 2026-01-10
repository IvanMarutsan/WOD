export const state = {
  lang: 'uk',
  theme: 'light',
  events: [],
  filteredEvents: [],
  user: null,
  isLoading: true
};

export const setEvents = (events) => {
  state.events = Array.isArray(events) ? events : [];
  state.isLoading = false;
};

export const setFilteredEvents = (filteredEvents) => {
  state.filteredEvents = Array.isArray(filteredEvents) ? filteredEvents : [];
};

export const setLoading = (value) => {
  state.isLoading = Boolean(value);
};

export const setLanguage = (lang) => {
  state.lang = lang;
};

export const setTheme = (theme) => {
  state.theme = theme;
};

export const setUser = (user) => {
  state.user = user;
};
