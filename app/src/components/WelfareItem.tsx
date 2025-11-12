import { View, Text, StyleSheet, Image } from "react-native";
import React, { memo, useEffect, useMemo } from "react";
import { COLORS } from "../utils/colors";
import { WelfareFamilyMember } from "../type/welfareType";
import { useSelector } from "react-redux";
import { RootState } from "../store";

type props = {
  location: string;
  category: string[];
  title: string;
  lightStatus: number;
  familyMember: WelfareFamilyMember[];
};

const getCircleColor = (lightStatus: number) => {
  switch (lightStatus) {
    case 1:
      return COLORS.light_green;
    case 2:
      return COLORS.light_yellow;
    case 3:
      return COLORS.light_red;
    default:
      return COLORS.light_yellow;
  }
};

function WelfareItem({
  location,
  category,
  title,
  lightStatus,
  familyMember,
}: props) {
  const circleColor = useMemo(() => {
    switch (lightStatus) {
      case 1:
        return COLORS.light_green;
      case 2:
        return COLORS.light_yellow;
      case 3:
        return COLORS.light_red;
      default:
        return COLORS.light_yellow;
    }
  }, [lightStatus]);

  const {
    locations,
    categories,
    identities,
    family,
    searchQuery,
    age,
    gender,
    income,
  } = useSelector((state: RootState) => state.filiter);
  const { user } = useSelector((state: RootState) => state.user);

  const truncatedTitle = useMemo(() => {
    return title.length > 16 ? title.slice(0, 16) + "..." : title;
  }, [title]);

  const familyAvatars = useMemo(() => {
    const userAvatar = (
      <>
        <View
          style={[
            styles.avatarBorderWrapper,
            { backgroundColor: getCircleColor(lightStatus) },
          ]}
          key={"1000"}
        >
          <Image style={styles.avatar} source={{ uri: user?.avatarUrl }} />
        </View>
      </>
    );

    return familyMember
      .map((item, index) => {
        const memberColor = getCircleColor(item.lightStatus);

        return (
          <View
            key={index}
            style={[
              styles.avatarBorderWrapper,
              { backgroundColor: memberColor },
            ]}
          >
            <Image style={styles.avatar} source={{ uri: item.avatarUrl }} />
          </View>
        );
      }) //
      .concat(lightStatus != 3 ? [userAvatar] : []);
  }, [familyMember]);

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <View>
          <Text style={styles.subTitle}>
            {location} / {category?.[0] ?? ""}
          </Text>
          <Text style={styles.title}>{truncatedTitle}</Text>
        </View>

        {familyMember.length > 0 && (
          <View style={styles.avatarContainer}>{familyAvatars}</View>
        )}
      </View>
      {lightStatus && family.length === 0 && (
        <View style={[styles.circle, { backgroundColor: circleColor }]} />
      )}
    </View>
  );
}

export default memo(WelfareItem);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginVertical: 20,
  },
  textContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    color: "black",
    marginVertical: 0,
    fontWeight: "500",
    height: 30,
  },
  subTitle: {
    fontWeight: "thin",
    fontStyle: "italic",
    color: "gray",
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 15,
    marginLeft: 10,
  },
  avatarContainer: {
    flexDirection: "row",
    gap: 5,
  },
  avatar: {
    zIndex: 2,
    width: 25,
    height: 25,
    borderRadius: 50,
  },
  avatarBorderWrapper: {
    padding: 3,
    borderRadius: 50,
  },
});
